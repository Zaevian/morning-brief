import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aether Sanctum | Zae",
  description: "Open Aether Sanctum in a new tab to play.",
};

const AETHER_SANCTUM_URL = "https://aether-sanctum.vercel.app";

export default function AetherSanctumPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
      <section className="card p-5 sm:p-6">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Play
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Aether Sanctum
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          Open Aether Sanctum in a new tab to play.
        </p>
        <a
          href={AETHER_SANCTUM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Play Aether Sanctum, opens in a new tab."
          className="mt-6 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-2.5 text-base font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Play
        </a>
      </section>
    </main>
  );
}
