import { json } from "@/lib/apothecary/http";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({ database: !!(process.env.DATABASE_URL ?? process.env.POSTGRES_URL), blob: !!process.env.BLOB_READ_WRITE_TOKEN, admin_token: !!process.env.APOTHECARY_ADMIN_TOKEN });
}
