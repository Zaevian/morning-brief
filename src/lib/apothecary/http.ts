import { NextResponse } from "next/server";
import { NotConfiguredError } from "./db";
import { isAdmin } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function requireAdmin(req: Request) {
  if (!isAdmin(req)) throw new HttpError(401, "Admin token required.");
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof NotConfiguredError) return json({ error: e.message, code: "not_configured" }, 503);
      const err = e as { code?: string; message?: string; detail?: string };
      if (err?.code === "23505") return json({ error: "Duplicate", detail: err.detail }, 409);
      if (err?.code === "23503" || err?.code === "23514" || err?.code === "22P02")
        return json({ error: "Invalid reference or value", detail: err.detail ?? err.message }, 400);
      console.error("apothecary error", e);
      return json({ error: "Internal error" }, 500);
    }
  };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try { return (await req.json()) as Record<string, unknown>; } catch { throw new HttpError(400, "Body must be JSON."); }
}
