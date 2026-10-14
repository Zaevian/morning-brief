import { timingSafeEqual } from "node:crypto";

/** Writes and private reads require `Authorization: Bearer <APOTHECARY_ADMIN_TOKEN>` (Vercel env only, never in repo). */
export function isAdmin(req: Request): boolean {
  const expected = process.env.APOTHECARY_ADMIN_TOKEN;
  if (!expected || expected.length < 24) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
