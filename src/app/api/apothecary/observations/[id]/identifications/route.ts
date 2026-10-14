import { q, newId, Row } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { identificationHistory, loadCard } from "@/lib/apothecary/card";
import { upsertReference } from "@/lib/apothecary/species";
export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => json(await identificationHistory((await ctx.params).id)));

/** Append a new identification revision (never edits old ones). Becomes the current one and re-links the observation's species. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  requireAdmin(req);
  const obsId = (await ctx.params).id;
  const b = await body(req) as Row;
  const [o] = await q("SELECT * FROM apo_observations WHERE id=$1", [obsId]);
  if (!o) throw new HttpError(404, "observation not found");
  const cands = (b.candidates ?? []) as Row[];
  if (cands.length > 3) throw new HttpError(400, "At most 3 candidates");
  const [{ max }] = await q("SELECT coalesce(max(revision),0) AS max FROM apo_identifications WHERE observation_id=$1", [obsId]);
  const id = newId("IDR");
  const resolved = (b.resolved_species_id as string) ?? (cands[0]?.species_id as string) ?? null;
  await q(`INSERT INTO apo_identifications (id, observation_id, revision, supersedes_id, status, resolved_rank, resolved_species_id, verified_by_human, author, change_note, uncertainties, diagnostic_features_observed, score_disclaimer)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,coalesce($13,'Scores are estimates, not calibrated probabilities.'))`,
    [id, obsId, Number(max) + 1, o.current_identification_id, b.status ?? "proposed", b.resolved_rank ?? "species", resolved, !!b.verified_by_human,
     b.author ?? "maomao", b.change_note ?? null, JSON.stringify(b.uncertainties ?? []), JSON.stringify(b.diagnostic_features_observed ?? []), b.score_disclaimer ?? null]);
  for (const [i, c] of cands.entries()) {
    await q(`INSERT INTO apo_candidates (identification_id, rank_order, species_id, scientific_name, common_name, rank, match_score, confidence_label, rationale, distinguishing_vs_primary, portrait_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, c.rank_order ?? i + 1, c.species_id ?? null, c.scientific_name, c.common_name ?? null, c.rank ?? "species", c.match_score, c.confidence_label ?? null,
       c.rationale ?? null, c.distinguishing_vs_primary ?? null, c.portrait_url ?? null]);
  }
  for (const s of (b.sources ?? []) as Row[]) await upsertReference(s, { type: "identification", id });
  await q("UPDATE apo_observations SET current_identification_id=$2, species_id=$3, updated_at=now() WHERE id=$1", [obsId, id, resolved]);
  return json(await loadCard(obsId, true), 201);
});
