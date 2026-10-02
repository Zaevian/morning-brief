import type { Metadata } from "next";
import { WeekendBoard } from "@/components/WeekendBoard";
import { loadWeekendDrop } from "@/lib/weekend";

const weekend = loadWeekendDrop();

export const metadata: Metadata = {
  title: "Weekend Fun | Zae",
  description: `Weekend plans for ${weekend.weekendRange.label}.`,
};

export default function WeekendPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:pb-16 sm:pt-8">
      <WeekendBoard weekend={weekend} />
    </main>
  );
}
