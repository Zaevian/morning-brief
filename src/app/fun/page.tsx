import type { Metadata } from "next";
import { FunBoard } from "@/components/FunBoard";
import { loadFunDrop } from "@/lib/fun";

// Re-render every 30 minutes so the Eastern-day fallback and past-event filter stay current.
export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  const fun = loadFunDrop();
  return {
    title: "Fun | Zae",
    description: `${fun.heading}: ${fun.range.label}.`,
  };
}

export default function FunPage() {
  const fun = loadFunDrop();
  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:pb-16 sm:pt-8">
      <FunBoard fun={fun} />
    </main>
  );
}
