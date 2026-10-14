import { q } from "@/lib/apothecary/db";
import { handle, json, requireAdmin, body } from "@/lib/apothecary/http";
import { upsertSpecies, upsertSpeciesChildren } from "@/lib/apothecary/species";
import { loadSpeciesFull } from "@/lib/apothecary/card";
export const dynamic = "force-dynamic";

export const GET = handle(async () => json(await q(`SELECT id, scientific_name, common_name, family, visual_group, rarity_tier, edible, iucn_status, version, updated_at FROM apo_species ORDER BY scientific_name`)));

/** Create or update (upsert) a full SpeciesProfile, including nested uses{category:[...]} and references[]. */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  const b = await body(req);
  const { id, created } = await upsertSpecies(b);
  await upsertSpeciesChildren(id, b);
  return json({ created, species: await loadSpeciesFull(id) }, created ? 201 : 200);
});
