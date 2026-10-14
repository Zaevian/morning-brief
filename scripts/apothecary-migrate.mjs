#!/usr/bin/env node
// Applies db/migrations/*.sql in order, once each. Usage: DATABASE_URL=postgres://... node scripts/apothecary-migrate.mjs
import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
const sql = neon(url);
await sql.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
const done = new Set((await sql.query("SELECT name FROM schema_migrations")).map((r) => r.name));
for (const f of readdirSync(new URL("../db/migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const text = readFileSync(new URL(`../db/migrations/${f}`, import.meta.url), "utf8");
  // Neon HTTP runs one statement per query: strip comments, split on ';' outside $$ bodies.
  const stmts = splitSql(text);
  await sql.transaction(stmts.map((s) => sql.query(s)).concat([sql.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f])]));
  console.log("applied", f);
}
console.log("migrations up to date");

function splitSql(text) {
  const clean = text.replace(/--[^\n]*$/gm, "");
  const out = []; let cur = "", inDollar = false;
  for (let i = 0; i < clean.length; i++) {
    if (clean.startsWith("$$", i)) { inDollar = !inDollar; cur += "$$"; i++; continue; }
    if (clean[i] === ";" && !inDollar) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += clean[i];
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
