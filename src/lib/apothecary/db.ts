import { neon } from "@neondatabase/serverless";

export class NotConfiguredError extends Error {}

/** Returns a Neon HTTP client. DATABASE_URL (or POSTGRES_URL) is injected by the Neon Marketplace integration. */
export function getSql() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new NotConfiguredError("Apothecary database is not configured (DATABASE_URL missing).");
  return neon(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export async function q(text: string, params: unknown[] = []): Promise<Row[]> {
  const sql = getSql();
  return (await sql.query(text, params)) as Row[];
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function observationId(date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `OBS-${d}-${rand}`;
}
