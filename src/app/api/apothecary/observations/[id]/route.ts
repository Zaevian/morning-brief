import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { isAdmin } from "@/lib/apothecary/auth";
import { setObserverValues } from "@/lib/apothecary/ingest";
import { recomputeCapture } from "@/lib/apothecary/capture";
import { loadCard } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const card = await loadCard((await ctx.params).id, isAdmin(req));
  if (!card) throw new HttpError(404, "Not found");
  return json(card);
});

const EDITABLE = ["location_label","precision_km","location_public","is_public","user_notes"];
/** Edits metadata and observer_* values. Effective date/time/coords are re-derived (EXIF still wins); EXIF is never edited. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  const b = await body(req);
  const [o] = await q("SELECT * FROM apo_observations WHERE id=$1", [id]);
  if (!o) throw new HttpError(404, "Not found");
  const next = { ...o };
  for (const k of EDITABLE) if (k in b) next[k] = b[k];
  await q(`UPDATE apo_observations SET location_label=$2, precision_km=$3, location_public=$4, is_public=$5, user_notes=$6, updated_at=now() WHERE id=$1`,
    [id, next.location_label, Number(next.precision_km) || 10, next.location_public, next.is_public, next.user_notes]);
  await setObserverValues(id, {
    observer_date: (b.observer_date ?? b.observed_date) as string, observer_approx_time: (b.observer_approx_time ?? b.approx_time) as string,
    observer_lat: (b.observer_lat ?? b.lat) as number, observer_lon: (b.observer_lon ?? b.lon) as number });
  await recomputeCapture(id);
  return json(await loadCard(id, true));
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  // Soft delete: hide from public. Originals and history are never destroyed by the API.
  await q("UPDATE apo_observations SET is_public=false, updated_at=now() WHERE id=$1", [(await ctx.params).id]);
  return json({ hidden: true });
});
