import sharp from "sharp";
import { q, observationId, newId } from "./db";
import { HttpError } from "./http";
import { putPrivate } from "./storage";
import { extractExif, sha256, coarsen, approxTimeBucket } from "./exif";

export interface IngestFields {
  observation_id?: string | null; role?: string | null; location_label?: string | null; precision_km?: string | number | null;
  is_public?: boolean | string | null; location_public?: boolean | string | null; user_notes?: string | null;
  species_id?: string | null; source?: string | null; credit?: string | null; license?: string | null;
}
const bool = (v: unknown, d: boolean) => (v == null || v === "" ? d : v === true || v === "true" || v === "1");

/** Shared pipeline for every intake path (multipart, client upload, URL).
 *  The original bytes are stored untouched (or were already stored at `existingOriginalPath` by a client upload),
 *  EXIF is read from those exact bytes, and an EXIF-stripped WebP display copy is made. */
export async function ingest(buf: Buffer, filename: string, contentType: string, f: IngestFields, existingOriginalPath?: string) {
  const hash = sha256(buf);
  const role = f.role || "observation";
  if (!["observation", "portrait"].includes(role)) throw new HttpError(400, "role must be observation|portrait");
  const dup = await q("SELECT id, observation_id FROM apo_media WHERE sha256=$1 AND role=$2", [hash, role]);
  if (dup.length) throw Object.assign(new HttpError(409, `This exact file was already uploaded as ${dup[0].id}`), { media: dup[0] });
  let meta: { width?: number; height?: number } = {};
  try { meta = await sharp(buf).metadata(); } catch { throw new HttpError(415, "Not a supported image"); }
  let obsId = f.observation_id || null;
  if (obsId && !(await q("SELECT 1 FROM apo_observations WHERE id=$1", [obsId])).length) throw new HttpError(404, "observation_id not found");

  const exif = await extractExif(buf);
  const mediaId = newId("MED");
  const ext = (filename.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? "").toLowerCase();
  const originalPath = existingOriginalPath ?? (await putPrivate(`apothecary/originals/${mediaId}${ext}`, buf, contentType || "application/octet-stream"));
  const web = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const webPath = await putPrivate(`apothecary/web/${mediaId}.webp`, web, "image/webp");

  if (role === "observation" && !obsId) {
    obsId = observationId();
    const precision = Number(f.precision_km ?? 10) || 10;
    const hasGps = exif.gps_lat != null && exif.gps_lon != null;
    await q(`INSERT INTO apo_observations (id, observed_date, approx_time, location_label, lat, lon, coarse_lat, coarse_lon, precision_km, location_source, location_public, is_public, user_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [obsId, exif.datetime_original?.slice(0, 10) ?? null, approxTimeBucket(exif.datetime_original), f.location_label || null,
       exif.gps_lat, exif.gps_lon, coarsen(exif.gps_lat, precision), coarsen(exif.gps_lon, precision), precision,
       hasGps ? "exif" : "none", bool(f.location_public, false), bool(f.is_public, true), f.user_notes || null]);
    const identId = newId("IDR");
    await q(`INSERT INTO apo_identifications (id, observation_id, revision, status, author, change_note) VALUES ($1,$2,1,'pending','pipeline','Uploaded; awaiting identification')`, [identId, obsId]);
    await q(`UPDATE apo_observations SET current_identification_id=$2 WHERE id=$1`, [obsId, identId]);
  }
  await q(`INSERT INTO apo_media (id, observation_id, role, original_pathname, original_filename, content_type, byte_size, sha256, web_pathname, width, height,
      exif_raw, exif_datetime_original, exif_offset_time, exif_gps_lat, exif_gps_lon, exif_gps_alt_m, camera_make, camera_model, lens, source, credit, license)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [mediaId, role === "observation" ? obsId : null, role, originalPath, filename, contentType, buf.length, hash, webPath, meta.width ?? exif.width, meta.height ?? exif.height,
     exif.raw ? JSON.stringify(exif.raw) : null, exif.datetime_original, exif.offset_time, exif.gps_lat, exif.gps_lon, exif.gps_alt_m,
     exif.camera_make, exif.camera_model, exif.lens, f.source ?? null, f.credit ?? null, f.license ?? null]);
  if (role === "portrait" && f.species_id) await q("UPDATE apo_species SET portrait_media_id=$2, portrait_source=coalesce($3,portrait_source), portrait_credit=coalesce($4,portrait_credit), portrait_license=coalesce($5,portrait_license), updated_at=now() WHERE id=$1",
    [f.species_id, mediaId, f.source ?? null, f.credit ?? null, f.license ?? null]);
  return { media_id: mediaId, observation_id: role === "observation" ? obsId : null, sha256: hash, byte_size: buf.length,
    exif: { datetime_original: exif.datetime_original, offset_time: exif.offset_time, has_gps: exif.gps_lat != null, camera_make: exif.camera_make, camera_model: exif.camera_model, lens: exif.lens, tag_count: exif.raw ? Object.keys(exif.raw).length : 0 } };
}

export const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024;
