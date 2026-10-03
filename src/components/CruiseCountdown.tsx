import { daysUntil } from "@/lib/cruise";

export function CruiseCountdown({
  name,
  targetDate,
  label,
  note,
}: {
  name: string;
  targetDate: string;
  label: string;
  note?: string;
}) {
  const days = daysUntil(targetDate);
  const display =
    days > 1 ? `${days} days` : days === 1 ? "1 day" : days === 0 ? "Today" : "Underway";

  return (
    <section className="card p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_80%_20%,rgba(125,211,252,0.35),transparent_45%)]" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
          Cruise countdown
        </p>
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-[var(--muted)] text-sm mt-1">
          {label}: Nov 1, 2026
        </p>
        <p className="mt-4 text-3xl font-semibold text-[var(--accent)]">{display}</p>
        {note ? (
          <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">{note}</p>
        ) : null}
      </div>
    </section>
  );
}
