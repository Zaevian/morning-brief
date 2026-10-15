import { q, observationId, newId } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { setObserverValues } from "@/lib/apothecary/ingest";
import { recomputeCapture } from "@/lib/apothecary/capture";
export const dynamic = "force-dynamic";

/** Create an observation without a photo (photos can be attached later via /upload?observation_id=). */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  const b = await body(req);
  const id = observationId();
  await q(`INSERT INTO apo_observations (id, location_label, precision_km, location_public, is_public, user_notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, b.location_label ?? null, Number(b.precision_km ?? 10) || 10, !!b.location_public, b.is_public !== false, b.user_notes ?? null]);
  // Hand-entered values: observer_date / observer_approx_time / observer_lat / observer_lon (legacy observed_date/approx_time/lat/lon accepted as aliases).
  await setObserverValues(id, {
    observer_date: (b.observer_date ?? b.observed_date) as string, observer_approx_time: (b.observer_approx_time ?? b.approx_time) as string,
    observer_lat: (b.observer_lat ?? b.lat) as number, observer_lon: (b.observer_lon ?? b.lon) as number });
  const identId = newId("IDR");
  await q(`INSERT INTO apo_identifications (id, observation_id, revision, status, author, change_note) VALUES ($1,$2,1,'pending','pipeline','Created; awaiting identification')`, [identId, id]);
  await q(`UPDATE apo_observations SET current_identification_id=$2 WHERE id=$1`, [id, identId]);
  await recomputeCapture(id);
  return json({ observation_id: id }, 201);
});
