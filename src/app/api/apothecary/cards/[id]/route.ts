import { handle, json, HttpError } from "@/lib/apothecary/http";
import { isAdmin } from "@/lib/apothecary/auth";
import { loadCard } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";
/** Full expandable-card payload (observation + media + current identification + history + species + uses + references). */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const card = await loadCard((await ctx.params).id, isAdmin(req));
  if (!card) throw new HttpError(404, "Not found");
  return json(card);
});
