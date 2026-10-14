import sharp from "sharp";
import { q, observationId, newId } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, HttpError } from "@/lib/apothecary/http";
import { putPrivate } from "@/lib/apothecary/storage";
import { extractExif, sha256, coarsen, approxTimeBucket } from "@/lib/apothecary/exif";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 4.5 * 1024 * 1024; // Vercel Functions request-body limit; see CONTRACT.md "Known limits"

/** multipart/form-data: file (required); observation_id (attach to existing) | otherwise a new observation is created;
 *  role=observation|portrait; species_id + source/credit/license for portraits; location_label, precision_km, is_public, location_public, user_notes. */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file is required");
  if (file.size > MAX) throw new HttpError(413, "Max 4.5 MB per request on Vercel (see CONTRACT.md Known limits)");
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);
  const role = (form.get("role") as string) || "observation";
  const dup = await q("SELECT id, observation_id FROM apo_media WHERE sha256=$1 AND role=$2", [hash, role]);
  if (dup.length) return json({ error: "This exact file was already uploaded", media_id: dup[0].id, observation_id: dup[0].observation_id }, 409);

  const exif = await extractExif(buf);
  let meta: { width?: number; height?: number } = {};
  try { meta = await sharp(buf).metadata(); } catch { throw new HttpError(415, "Unsupported image format"); }
  const mediaId = newId("MED");
  const ext = (file.name.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? "").toLowerCase();
  // Original: stored byte-for-byte, never re-encoded.
  const originalPath = await putPrivate(`apothecary/originals/${mediaId}${ext}`, buf, file.type || "application/octet-stream");
  // Display copy: auto-rotated, max 1600px, WebP, all metadata stripped (no GPS leaves via public URLs).
  const web = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const webPath = await putPrivate(`apothecary/web/${mediaId}.webp`, web, "image/webp");

  let obsId = (form.get("observation_id") as string) || null;
  const bool = (k: string, d: boolean) => { const v = form.get(k); return v == null ? d : v === "true" || v === "1"; };
  if (role === "observation" && !obsId) {
    obsId = observationId();
    const precision = Number(form.get("precision_km") ?? 10) || 10;
    const hasGps = exif.gps_lat != null && exif.gps_lon != null;
    await q(`INSERT INTO apo_observations (id, observed_date, approx_time, location_label, lat, lon, coarse_lat, coarse_lon, precision_km, location_source, location_public, is_public, user_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [obsId, exif.datetime_original?.slice(0, 10) ?? null, approxTimeBucket(exif.datetime_original), (form.get("location_label") as string) || null,
       exif.gps_lat, exif.gps_lon, coarsen(exif.gps_lat, precision), coarsen(exif.gps_lon, precision), precision,
       hasGps ? "exif" : "none", bool("location_public", false), bool("is_public", true), (form.get("user_notes") as string) || null]);
    const identId = newId("IDR");
    await q(`INSERT INTO apo_identifications (id, observation_id, revision, status, author, change_note) VALUES ($1,$2,1,'pending','pipeline','Uploaded; awaiting identification')`, [identId, obsId]);
    await q(`UPDATE apo_observations SET current_identification_id=$2 WHERE id=$1`, [obsId, identId]);
  } else if (obsId) {
    const o = await q("SELECT id FROM apo_observations WHERE id=$1", [obsId]);
    if (!o.length) throw new HttpError(404, "observation_id not found");
  }
  await q(`INSERT INTO apo_media (id, observation_id, role, original_pathname, original_filename, content_type, byte_size, sha256, web_pathname, width, height,
      exif_raw, exif_datetime_original, exif_offset_time, exif_gps_lat, exif_gps_lon, exif_gps_alt_m, camera_make, camera_model, lens, source, credit, license)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [mediaId, role === "observation" ? obsId : null, role, originalPath, file.name, file.type, buf.length, hash, webPath, meta.width ?? exif.width, meta.height ?? exif.height,
     exif.raw ? JSON.stringify(exif.raw) : null, exif.datetime_original, exif.offset_time, exif.gps_lat, exif.gps_lon, exif.gps_alt_m,
     exif.camera_make, exif.camera_model, exif.lens, form.get("source") ?? null, form.get("credit") ?? null, form.get("license") ?? null]);
  const speciesId = form.get("species_id") as string | null;
  if (role === "portrait" && speciesId) await q("UPDATE apo_species SET portrait_media_id=$2, portrait_source=coalesce($3,portrait_source), portrait_credit=coalesce($4,portrait_credit), portrait_license=coalesce($5,portrait_license), updated_at=now() WHERE id=$1",
    [speciesId, mediaId, form.get("source"), form.get("credit"), form.get("license")]);
  return json({ media_id: mediaId, observation_id: obsId, sha256: hash, byte_size: buf.length,
    exif: { datetime_original: exif.datetime_original, offset_time: exif.offset_time, has_gps: exif.gps_lat != null, camera_make: exif.camera_make, camera_model: exif.camera_model, lens: exif.lens, tag_count: exif.raw ? Object.keys(exif.raw).length : 0 } }, 201);
});
