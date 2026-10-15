import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { addSignoff } from "@/lib/apothecary/species";
import { rarityProvisional } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const rows = await q("SELECT by, decision, tier, sources, note, at FROM apo_rarity_signoffs WHERE species_id=$1 ORDER BY at", [(await ctx.params).id]);
  return json({ provisional: rarityProvisional(rows), signoffs: rows });
});
/** Body: {by, decision: "cosign"|"dissent", tier?, sources[], note?, at?} (append-only) */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const id = (await ctx.params).id;
  await addSignoff(id, await body(req));
  const rows = await q("SELECT by, decision, tier, sources, note, at FROM apo_rarity_signoffs WHERE species_id=$1 ORDER BY at", [id]);
  return json({ provisional: rarityProvisional(rows), signoffs: rows }, 201);
});
