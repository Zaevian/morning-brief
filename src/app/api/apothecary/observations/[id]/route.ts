import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { isAdmin } from "@/lib/apothecary/auth";
import { coarsen } from "@/lib/apothecary/exif";
import { loadCard } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const card = await loadCard((await ctx.params).id, isAdmin(req));
  if (!card) throw new HttpError(404, "Not found");
  return json(card);
});

const EDITABLE = ["observed_date","approx_time","location_label","precision_km","location_public","is_public","user_notes","lat","lon"];
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  const b = await body(req);
  const [o] = await q("SELECT * FROM apo_observations WHERE id=$1", [id]);
  if (!o) throw new HttpError(404, "Not found");
  const next = { ...o };
  for (const k of EDITABLE) if (k in b) next[k] = b[k];
  if ("lat" in b || "lon" in b) next.location_source = next.lat != null ? "user" : "none";
  const p = Number(next.precision_km) || 10;
  await q(`UPDATE apo_observations SET observed_date=$2, approx_time=$3, location_label=$4, precision_km=$5, location_public=$6, is_public=$7, user_notes=$8,
      lat=$9, lon=$10, coarse_lat=$11, coarse_lon=$12, location_source=$13, updated_at=now() WHERE id=$1`,
    [id, next.observed_date, next.approx_time, next.location_label, p, next.location_public, next.is_public, next.user_notes,
     next.lat, next.lon, coarsen(next.lat, p), coarsen(next.lon, p), next.location_source]);
  return json(await loadCard(id, true));
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  // Soft delete: hide from public. Originals and history are never destroyed by the API.
  await q("UPDATE apo_observations SET is_public=false, updated_at=now() WHERE id=$1", [(await ctx.params).id]);
  return json({ hidden: true });
});
