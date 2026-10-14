import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { upsertUse, linkReference } from "@/lib/apothecary/species";
export const dynamic = "force-dynamic";
/** Body: {id?, category, title, detail, cautions[], evidence_level, sort_order, source_ids[]} */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  const b = await body(req);
  const id = await upsertUse(b, (await ctx.params).id);
  for (const r of (b.source_ids ?? []) as string[]) await linkReference(r, "use", id);
  return json({ use_id: id }, 201);
});
