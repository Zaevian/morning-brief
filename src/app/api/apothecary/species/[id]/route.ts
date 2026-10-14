import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { upsertSpecies, upsertSpeciesChildren } from "@/lib/apothecary/species";
import { loadSpeciesFull } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const s = await loadSpeciesFull((await ctx.params).id);
  if (!s) throw new HttpError(404, "Not found");
  return json(s);
});
/** Partial update: only fields present in the body change; version bumps. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  if (!(await q("SELECT 1 FROM apo_species WHERE id=$1", [id])).length) throw new HttpError(404, "Not found");
  const b = await body(req);
  await upsertSpecies(b, id);
  await upsertSpeciesChildren(id, b);
  return json(await loadSpeciesFull(id));
});
/** Refuses if any observation or identification still points at the species. */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  const used = await q("SELECT (SELECT count(*) FROM apo_observations WHERE species_id=$1) + (SELECT count(*) FROM apo_identifications WHERE resolved_species_id=$1) + (SELECT count(*) FROM apo_candidates WHERE species_id=$1) AS n", [id]);
  if (Number(used[0].n) > 0) throw new HttpError(409, "Species is referenced by observations/identifications; re-identify them first.");
  await q("DELETE FROM apo_reference_links WHERE target_type='species' AND target_id=$1", [id]);
  await q("DELETE FROM apo_species WHERE id=$1", [id]);
  return json({ deleted: id });
});
