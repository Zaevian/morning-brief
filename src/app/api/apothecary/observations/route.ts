import { q, observationId, newId } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { coarsen } from "@/lib/apothecary/exif";
export const dynamic = "force-dynamic";

/** Create an observation without a photo (photos can be attached later via /upload?observation_id=). */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  const b = await body(req);
  const id = observationId();
  const p = Number(b.precision_km ?? 10) || 10;
  const lat = (b.lat as number) ?? null, lon = (b.lon as number) ?? null;
  await q(`INSERT INTO apo_observations (id, observed_date, approx_time, location_label, lat, lon, coarse_lat, coarse_lon, precision_km, location_source, location_public, is_public, user_notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, b.observed_date ?? null, b.approx_time ?? "unknown", b.location_label ?? null, lat, lon, coarsen(lat, p), coarsen(lon, p), p,
     lat != null ? "user" : "none", !!b.location_public, b.is_public !== false, b.user_notes ?? null]);
  const identId = newId("IDR");
  await q(`INSERT INTO apo_identifications (id, observation_id, revision, status, author, change_note) VALUES ($1,$2,1,'pending','pipeline','Created; awaiting identification')`, [identId, id]);
  await q(`UPDATE apo_observations SET current_identification_id=$2 WHERE id=$1`, [id, identId]);
  return json({ observation_id: id }, 201);
});
