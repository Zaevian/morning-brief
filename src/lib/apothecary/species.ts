import { q, Row } from "./db";
import { HttpError } from "./http";

/** Maps Maomao's nested SpeciesProfile JSON (schema v0.1 + v1 additions) onto apo_species columns. */
export function speciesToColumns(p: Row): Row {
  const t = p.taxonomy ?? {}, cs = p.conservation_status ?? {}, r = p.collectible_rarity ?? {};
  const ed = p.edibility ?? {}, tx = p.toxicity ?? {}, h = tx.humans ?? {}, ns = p.native_status ?? {}, pt = p.portrait ?? {};
  const c: Row = {
    scientific_name: p.scientific_name, common_name: p.common_name, authority: p.authority, rank: p.rank,
    kingdom: t.kingdom, phylum: t.phylum, class: t.class, order: t.order, family: t.family, genus: t.genus, species_epithet: t.species,
    organism_type: p.organism_type, visual_group: p.visual_group,
    distinguishing_characteristics: p.distinguishing_characteristics,
    geographic_distribution: p.geographic_distribution, typical_habitat: p.typical_habitat, seasonal_occurrence: p.seasonal_occurrence,
    native_region: ns.region, native_status: ns.status,
    iucn_status: cs.iucn, regional_status: cs.regional, conservation_source: cs.source,
    rarity_tier: r.tier, rarity_color: r.color, rarity_region_basis: r.region_basis, rarity_evidence: r.evidence,
    rarity_assessed_by: r.assessed_by, // provisional is derived from signoffs, not written
    edible: ed.edible, edible_parts: ed.edible_parts, edibility_conditions: ed.conditions, edibility_cautions: ed.cautions,
    toxicity_humans_level: h.level, toxicity_humans_details: h.details, toxicity_compounds: h.compounds,
    toxicity_animals: tx.animals, allergens: tx.allergens, dangerous_lookalikes: tx.dangerous_lookalikes,
    ecological_role: p.ecological_role, interesting_facts: p.interesting_facts, chemical_constituents: p.chemical_constituents,
    portrait_media_id: pt.media_id, portrait_url: pt.url, portrait_source: pt.source, portrait_credit: pt.credit, portrait_license: pt.license,
    last_reviewed: p.record_meta?.last_reviewed, reviewer: p.record_meta?.reviewer,
  };
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return c;
}

const JSONB = new Set(["distinguishing_characteristics","rarity_assessed_by","edible_parts","edibility_cautions","toxicity_compounds","toxicity_animals","allergens","dangerous_lookalikes","interesting_facts","chemical_constituents"]);
const col = (k: string) => (k === "order" || k === "class" ? `"${k}"` : k);
const val = (k: string, v: unknown) => (JSONB.has(k) ? JSON.stringify(v ?? []) : v);

export function slugId(name: string) {
  return "SP-" + name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function upsertSpecies(p: Row, idFromPath?: string): Promise<{ id: string; created: boolean }> {
  const cols = speciesToColumns(p);
  const id = idFromPath ?? p.species_profile_id ?? (p.scientific_name ? slugId(p.scientific_name) : null);
  if (!id || !/^SP-[a-z0-9-]+$/.test(id)) throw new HttpError(400, "species_profile_id must look like SP-<slug> (or give scientific_name).");
  const existing = await q("SELECT id FROM apo_species WHERE id=$1", [id]);
  const keys = Object.keys(cols);
  if (!existing.length) {
    if (!cols.scientific_name) throw new HttpError(400, "scientific_name is required to create a species.");
    await q(`INSERT INTO apo_species (id, ${keys.map(col).join(",")}) VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(",")})`,
      [id, ...keys.map((k) => val(k, cols[k]))]);
    return { id, created: true };
  }
  if (keys.length) {
    await q(`UPDATE apo_species SET ${keys.map((k, i) => `${col(k)}=$${i + 2}`).join(",")}, version=version+1, updated_at=now() WHERE id=$1`,
      [id, ...keys.map((k) => val(k, cols[k]))]);
  }
  return { id, created: false };
}

/** Optional nested uses/references inside a species payload are upserted too. */
export async function upsertSpeciesChildren(speciesId: string, p: Row) {
  for (const so of (p.collectible_rarity?.signoffs ?? []) as Row[]) await addSignoff(speciesId, so);
  const refIds: Record<string, string> = {};
  for (const ref of (p.references ?? []) as Row[]) refIds[ref.id] = await upsertReference(ref, { type: "species", id: speciesId });
  if (p.uses && typeof p.uses === "object") {
    for (const [category, items] of Object.entries(p.uses as Record<string, Row[]>)) {
      for (const [i, u] of (items ?? []).entries()) {
        const useId = await upsertUse({ ...u, category, sort_order: u.sort_order ?? i }, speciesId);
        for (const sid of (u.source_ids ?? []) as string[]) await linkReference(refIds[sid] ?? sid, "use", useId);
      }
    }
  }
}

export async function upsertUse(u: Row, speciesId: string): Promise<string> {
  const id = u.id ?? `USE-${crypto.randomUUID()}`;
  await q(`INSERT INTO apo_uses (id, species_id, category, title, detail, description, cautions, evidence_level, sort_order)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, detail=EXCLUDED.detail, description=EXCLUDED.description,
      cautions=EXCLUDED.cautions, evidence_level=EXCLUDED.evidence_level, sort_order=EXCLUDED.sort_order, updated_at=now()`,
    [id, speciesId, u.category, u.use ?? u.title, u.detail ?? null, u.description ?? null, JSON.stringify(u.cautions ?? []), u.evidence_level ?? null, u.sort_order ?? 0]);
  return id;
}

export async function upsertReference(r: Row, link?: { type: string; id: string }): Promise<string> {
  const id = r.id && /^[A-Za-z0-9_.:-]{1,80}$/.test(r.id) ? (r.id.startsWith("REF-") ? r.id : `REF-${r.id}`) : `REF-${crypto.randomUUID()}`;
  await q(`INSERT INTO apo_references (id, title, url, type, authors, year, accessed) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, url=EXCLUDED.url, type=EXCLUDED.type, authors=EXCLUDED.authors, year=EXCLUDED.year, accessed=EXCLUDED.accessed`,
    [id, r.title, r.url ?? null, r.type ?? "other", r.authors ?? null, r.year ?? null, r.accessed || null]);
  if (link) await linkReference(id, link.type, link.id);
  return id;
}

export async function linkReference(referenceId: string, targetType: string, targetId: string, note?: string) {
  await q(`INSERT INTO apo_reference_links (reference_id, target_type, target_id, note) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [referenceId, targetType, targetId, note ?? null]);
}

/** Appends a rarity sign-off; identical (by, at) entries are ignored so re-posting a full profile is safe. */
export async function addSignoff(speciesId: string, so: Row) {
  if (!so.by || !["cosign", "dissent"].includes(so.decision)) throw new HttpError(400, "signoff needs by and decision cosign|dissent");
  await q(`INSERT INTO apo_rarity_signoffs (species_id, by, decision, tier, sources, note, at) VALUES ($1,$2,$3,$4,$5,$6,coalesce($7::timestamptz, now()))
    ON CONFLICT (species_id, by, at) DO NOTHING`,
    [speciesId, String(so.by).toLowerCase(), so.decision, so.tier ?? null, JSON.stringify(so.sources ?? []), so.note ?? null, so.at ?? null]);
}
