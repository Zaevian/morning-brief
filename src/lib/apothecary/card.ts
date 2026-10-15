import { q, Row } from "./db";

export const USE_CATEGORY_LABELS = {
  culinary: "Culinary", traditional_medicine: "Traditional Medicine", evidence_based_medical: "Evidence-Based Medical Applications",
  scientific_research: "Scientific Research", industrial: "Industrial Uses", agriculture: "Agriculture", cosmetics: "Cosmetics",
  ecological: "Ecological Roles", historical_cultural: "Historical Uses", other_verified: "Other Verified Applications",
} as const;
const USE_CATEGORIES = Object.keys(USE_CATEGORY_LABELS) as (keyof typeof USE_CATEGORY_LABELS)[];
const ABOVE_GENUS = new Set(["family", "order", "higher"]);

/** v0.2: High >= 75, Medium 40-74, Low < 40; forced Low when resolved above genus. Scores are independent, never normalized. */
export function confidenceLabel(score: number | null | undefined, resolvedRank?: string | null): "High" | "Medium" | "Low" | null {
  if (resolvedRank && ABOVE_GENUS.has(resolvedRank)) return "Low";
  if (score == null) return null;
  return score >= 75 ? "High" : score >= 40 ? "Medium" : "Low";
}

/** provisional stays true until maomao AND treyni's latest sign-offs are both cosign. */
export function rarityProvisional(signoffs: Row[]): boolean {
  const latest = new Map<string, string>();
  for (const so of [...signoffs].sort((a, b) => +new Date(a.at) - +new Date(b.at))) latest.set(so.by, so.decision);
  return !(latest.get("maomao") === "cosign" && latest.get("treyni") === "cosign");
}

export function speciesPayload(s: Row, uses: Row[], refs: Row[], signoffs: Row[] = []) {
  const byTarget = (type: string, id: string) => refs.filter((r) => r.target_type === type && r.target_id === id).map((r) => r.id);
  const usesOut: Record<string, unknown[]> = {};
  for (const cat of USE_CATEGORIES) {
    const items = uses.filter((u) => u.category === cat).map((u) => ({
      id: u.id, use: u.title, detail: u.detail, description: u.description, cautions: u.cautions, evidence_level: u.evidence_level, source_ids: byTarget("use", u.id),
    }));
    if (items.length) usesOut[cat] = items; // complete list, no truncation: drives the category dropdown
  }
  const use_categories = USE_CATEGORIES.filter((c) => usesOut[c]).map((c) => ({ key: c, label: USE_CATEGORY_LABELS[c], count: usesOut[c].length }));
  const seen = new Set<string>();
  const references = refs.filter((r) => !seen.has(r.id) && seen.add(r.id)).map((r) => ({ id: r.id, title: r.title, url: r.url, type: r.type, authors: r.authors, year: r.year, accessed: r.accessed }));
  return {
    species_profile_id: s.id, scientific_name: s.scientific_name, common_name: s.common_name, authority: s.authority, rank: s.rank,
    taxonomy: { kingdom: s.kingdom, phylum: s.phylum, class: s.class, order: s.order, family: s.family, genus: s.genus, species: s.species_epithet },
    organism_type: s.organism_type, visual_group: s.visual_group,
    distinguishing_characteristics: s.distinguishing_characteristics,
    geographic_distribution: s.geographic_distribution, typical_habitat: s.typical_habitat, seasonal_occurrence: s.seasonal_occurrence,
    native_status: { region: s.native_region, status: s.native_status },
    conservation_status: { iucn: s.iucn_status, regional: s.regional_status, source: s.conservation_source },
    collectible_rarity: { tier: s.rarity_tier, color: s.rarity_color, region_basis: s.rarity_region_basis, evidence: s.rarity_evidence, provisional: rarityProvisional(signoffs), assessed_by: s.rarity_assessed_by,
      signoffs: signoffs.map((so) => ({ by: so.by, decision: so.decision, tier: so.tier, sources: so.sources, note: so.note, at: so.at })) },
    edibility: { edible: s.edible, edible_parts: s.edible_parts, conditions: s.edibility_conditions, cautions: s.edibility_cautions,
      verified_safe_specimen: false, warning: "Species-level edibility is not a safety verification of this specimen." },
    toxicity: { humans: { level: s.toxicity_humans_level, details: s.toxicity_humans_details, compounds: s.toxicity_compounds },
      animals: s.toxicity_animals, allergens: s.allergens, dangerous_lookalikes: s.dangerous_lookalikes },
    ecological_role: s.ecological_role, interesting_facts: s.interesting_facts, chemical_constituents: s.chemical_constituents,
    portrait: { media_id: s.portrait_media_id, url: s.portrait_media_id ? `/api/apothecary/media/${s.portrait_media_id}` : s.portrait_url,
      source: s.portrait_source, credit: s.portrait_credit, license: s.portrait_license },
    uses: usesOut, use_categories, references,
    record_meta: { version: s.version, last_reviewed: s.last_reviewed, reviewer: s.reviewer, updated_at: s.updated_at },
  };
}

export async function loadSpeciesFull(id: string) {
  const [s] = await q(`SELECT * FROM apo_species WHERE id=$1`, [id]);
  if (!s) return null;
  const uses = await q(`SELECT * FROM apo_uses WHERE species_id=$1 ORDER BY category, sort_order, created_at`, [id]);
  const refs = await q(`SELECT r.*, l.target_type, l.target_id FROM apo_reference_links l JOIN apo_references r ON r.id=l.reference_id
     WHERE (l.target_type='species' AND l.target_id=$1) OR (l.target_type='use' AND l.target_id = ANY($2))`, [id, uses.map((u) => u.id)]);
  const signoffs = await q(`SELECT * FROM apo_rarity_signoffs WHERE species_id=$1 ORDER BY at`, [id]);
  return speciesPayload(s, uses, refs, signoffs);
}

function mediaOut(m: Row, admin: boolean) {
  const base = { id: m.id, role: m.role, width: m.width, height: m.height, sha256: m.sha256, byte_size: m.byte_size,
    url: `/api/apothecary/media/${m.id}`, // EXIF-stripped display copy
    camera: { make: m.camera_make, model: m.camera_model, lens: m.lens },
    datetime_original: m.exif_datetime_original, offset_time: m.exif_offset_time };
  if (!admin) return base;
  return { ...base, original_url: `/api/apothecary/media/${m.id}?variant=original`, original_filename: m.original_filename, content_type: m.content_type,
    exif: { gps_lat: m.exif_gps_lat, gps_lon: m.exif_gps_lon, gps_alt_m: m.exif_gps_alt_m, raw: m.exif_raw } };
}

export async function identificationHistory(obsId: string) {
  const ids = await q(`SELECT * FROM apo_identifications WHERE observation_id=$1 ORDER BY revision`, [obsId]);
  const cands = ids.length ? await q(`SELECT * FROM apo_candidates WHERE identification_id = ANY($1) ORDER BY rank_order`, [ids.map((i) => i.id)]) : [];
  const refs = ids.length ? await q(`SELECT r.*, l.target_id FROM apo_reference_links l JOIN apo_references r ON r.id=l.reference_id WHERE l.target_type='identification' AND l.target_id = ANY($1)`, [ids.map((i) => i.id)]) : [];
  return ids.map((i) => { const top = cands.find((c) => c.identification_id === i.id && c.rank_order === 1); return {
    id: i.id, identification_confidence_label: confidenceLabel(top?.match_score, i.resolved_rank), revision: i.revision, supersedes_id: i.supersedes_id, status: i.status, resolved_rank: i.resolved_rank,
    resolved_species_id: i.resolved_species_id, verified_by_human: i.verified_by_human, author: i.author, change_note: i.change_note,
    uncertainties: i.uncertainties, diagnostic_features_observed: i.diagnostic_features_observed, score_disclaimer: i.score_disclaimer, created_at: i.created_at,
    candidates: cands.filter((c) => c.identification_id === i.id).map((c) => ({
      rank_order: c.rank_order, species_id: c.species_id, scientific_name: c.scientific_name, common_name: c.common_name, rank: c.rank,
      match_score: c.match_score, confidence_label: c.confidence_label ?? confidenceLabel(c.match_score), rationale: c.rationale,
      distinguishing_vs_primary: c.distinguishing_vs_primary, portrait_url: c.portrait_url,
      portrait_source: c.portrait_source, portrait_credit: c.portrait_credit, portrait_license: c.portrait_license })),
    sources: refs.filter((r) => r.target_id === i.id).map((r) => ({ id: r.id, title: r.title, url: r.url, accessed: r.accessed })),
  }; });
}

export function observationOut(o: Row, media: Row[], admin: boolean) {
  const precise = admin || o.location_public;
  return {
    observation_id: o.id, species_profile_id: o.species_id, current_identification_id: o.current_identification_id,
    observed_date: o.observed_date, approx_time: o.approx_time,
    location: { label: o.location_label, lat: precise ? o.lat : o.coarse_lat, lon: precise ? o.lon : o.coarse_lon,
      precision_km: precise ? null : o.precision_km, source: o.location_source, is_precise: !!precise },
    is_public: o.is_public, location_public: o.location_public, user_notes: o.user_notes, created_at: o.created_at, updated_at: o.updated_at,
    media: media.filter((m) => m.observation_id === o.id).map((m) => mediaOut(m, admin)),
  };
}

/** Full expandable-card payload for one observation. */
export async function loadCard(obsId: string, admin: boolean) {
  const [o] = await q(`SELECT * FROM apo_observations WHERE id=$1`, [obsId]);
  if (!o || (!o.is_public && !admin)) return null;
  const media = await q(`SELECT * FROM apo_media WHERE observation_id=$1 ORDER BY sort_order, created_at`, [obsId]);
  const history = await identificationHistory(obsId);
  const current = history.find((h) => h.id === o.current_identification_id) ?? null;
  const species = o.species_id ? await loadSpeciesFull(o.species_id) : null;
  const others = o.species_id ? await q(`SELECT id, observed_date, approx_time, location_label FROM apo_observations
      WHERE species_id=$1 AND id<>$2 ${admin ? "" : "AND is_public"} ORDER BY observed_date DESC NULLS LAST`, [o.species_id, obsId]) : [];
  return {
    card_version: 1,
    observation: observationOut(o, media, admin),
    identification: current, identification_history: history,
    species,
    sightings_of_species: { count: others.length + 1, others },
  };
}
