import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { upsertReference, linkReference } from "@/lib/apothecary/species";
export const dynamic = "force-dynamic";
export const GET = handle(async () => json(await q("SELECT * FROM apo_references ORDER BY created_at DESC")));
/** Body: {id?, title, url, type, authors, year, accessed, links:[{target_type:'species'|'use'|'identification', target_id, note?}]} */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  const b = await body(req);
  const id = await upsertReference(b);
  for (const l of (b.links ?? []) as { target_type: string; target_id: string; note?: string }[]) await linkReference(id, l.target_type, l.target_id, l.note);
  return json({ reference_id: id }, 201);
});
