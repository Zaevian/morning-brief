import type { Metadata } from "next";

export const metadata: Metadata = { title: "Apothecary Collection | Zae" };

// Placeholder. Treyni owns the real collection page; data comes from /api/apothecary/* (see docs/apothecary/CONTRACT.md).
export default function ApothecaryPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">
      <h1>Apothecary Collection</h1>
      <p>Coming soon.</p>
    </main>
  );
}
