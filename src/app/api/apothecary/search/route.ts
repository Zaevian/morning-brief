import { q } from "@/lib/apothecary/db";
import { handle, json } from "@/lib/apothecary/http";
import { isAdmin } from "@/lib/apothecary/auth";
import { confidenceLabel } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";

/** GET ?q=&kingdom=&class=&order=&family=&genus=&organism_type=&visual_group=&rarity=&edible=&iucn=&status=&verified=&limit=&offset=
 *  Returns one summary row per observation (newest first) for collection grids. */
export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const admin = isAdmin(req);
  const where: string[] = [], params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (!admin) where.push("o.is_public");
  const text = sp.get("q")?.trim();
  if (text) add("(s.search @@ plainto_tsquery('simple', ?) OR s.scientific_name ILIKE '%'||$X||'%' OR s.common_name ILIKE '%'||$X||'%' OR o.location_label ILIKE '%'||$X||'%' OR o.user_notes ILIKE '%'||$X||'%')".replaceAll("$X", `$${params.length + 1}`), text);
  for (const [p, c] of [["kingdom","s.kingdom"],["phylum","s.phylum"],["class","s.class"],["order",'s."order"'],["family","s.family"],["genus","s.genus"],
      ["organism_type","s.organism_type"],["visual_group","s.visual_group"],["rarity","s.rarity_tier"],["edible","s.edible"],["iucn","s.iucn_status"],["status","i.status"]] as const) {
    const v = sp.get(p); if (v) add(`${c} = ANY(string_to_array(?, ','))`, v);
  }
  if (sp.get("verified")) add("i.verified_by_human = ?", sp.get("verified") === "true");
  if (sp.get("species_id")) add("o.species_id = ?", sp.get("species_id"));
  const limit = Math.min(Number(sp.get("limit") ?? 50) || 50, 200), offset = Number(sp.get("offset") ?? 0) || 0;
  const rows = await q(`SELECT o.id AS observation_id, o.observed_date, o.approx_time, o.location_label, o.created_at,
      s.id AS species_id, s.scientific_name, s.common_name, s.visual_group, s.rarity_tier, s.rarity_color, NOT (coalesce((SELECT so.decision FROM apo_rarity_signoffs so WHERE so.species_id=s.id AND so.by='maomao' ORDER BY so.at DESC LIMIT 1)='cosign', false) AND coalesce((SELECT so.decision FROM apo_rarity_signoffs so WHERE so.species_id=s.id AND so.by='treyni' ORDER BY so.at DESC LIMIT 1)='cosign', false)) AS rarity_provisional, s.edible, s.iucn_status, s.family,
      i.status AS id_status, i.resolved_rank, i.verified_by_human,
      (SELECT c.match_score FROM apo_candidates c WHERE c.identification_id=i.id AND c.rank_order=1) AS top_score,
      (SELECT c.scientific_name FROM apo_candidates c WHERE c.identification_id=i.id AND c.rank_order=1) AS top_candidate,
      (SELECT m.id FROM apo_media m WHERE m.observation_id=o.id ORDER BY m.sort_order, m.created_at LIMIT 1) AS cover_media_id,
      count(*) OVER() AS total
    FROM apo_observations o LEFT JOIN apo_species s ON s.id=o.species_id LEFT JOIN apo_identifications i ON i.id=o.current_identification_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY o.observed_date DESC NULLS LAST, o.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  return json({ total: Number(rows[0]?.total ?? 0), results: rows.map(({ cover_media_id, ...r }) => ({ ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "total")), identification_confidence_label: confidenceLabel(r.top_score, r.resolved_rank), cover_url: cover_media_id ? `/api/apothecary/media/${cover_media_id}` : null })) });
});
