import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { upsertUse } from "@/lib/apothecary/species";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  const [u] = await q("SELECT * FROM apo_uses WHERE id=$1", [id]);
  if (!u) throw new HttpError(404, "Not found");
  await upsertUse({ ...u, ...(await body(req)), id }, u.species_id);
  return json({ use_id: id });
});
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  await q("DELETE FROM apo_reference_links WHERE target_type='use' AND target_id=$1", [id]);
  await q("DELETE FROM apo_uses WHERE id=$1", [id]);
  return json({ deleted: id });
});
