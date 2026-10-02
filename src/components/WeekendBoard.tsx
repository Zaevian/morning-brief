import type { WeekendDay, WeekendDrop } from "@/lib/types";
import {
  WEEKEND_DAYS,
  WEEKEND_DAY_LABEL,
  eventsForDay,
  formatWeekendDate,
} from "@/lib/weekend";
import { EventCard } from "@/components/EventCard";

const DAY_TEXT: Record<WeekendDay, string> = {
  Fri: "text-[var(--accent)]",
  Sat: "text-[var(--accent-2)]",
  Sun: "text-[var(--warm)]",
};

function dayHeadingDate(events: WeekendDrop["events"], day: WeekendDay): string | undefined {
  const iso = eventsForDay(events, day).find((event) => event.date)?.date;
  return iso ? formatWeekendDate(iso) : undefined;
}

export function WeekendBoard({ weekend }: { weekend: WeekendDrop }) {
  const { weekendRange, events } = weekend;
  const hasEvents = events.length > 0;
  const hasSamples = events.some((event) => event.sample);

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Weekend fun
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Out this weekend
        </h1>
        <p className="mt-2 text-[var(--muted)]">{weekendRange.label}</p>
        {weekendRange.updatedNote ? (
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {weekendRange.updatedNote}
          </p>
        ) : null}
      </header>

      {hasSamples ? (
        <p className="mb-5 rounded-2xl border border-[rgba(251,191,36,0.28)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-sm leading-relaxed text-[var(--warm)]">
          Sample weekend. These cards are placeholders until a real list replaces them.
        </p>
      ) : null}

      {hasEvents ? (
        <>
          <nav aria-label="Weekend days" className="mb-6 flex flex-wrap gap-2">
            {WEEKEND_DAYS.map((day) => {
              const count = eventsForDay(events, day).length;
              return (
                <a
                  key={day}
                  href={`#day-${day}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm transition hover:border-white/20 hover:bg-white/10"
                >
                  <span className={`font-medium ${DAY_TEXT[day]}`}>
                    {WEEKEND_DAY_LABEL[day]}
                  </span>
                  <span className="tabular-nums text-xs text-[var(--muted)]">{count}</span>
                </a>
              );
            })}
          </nav>

          <div className="grid gap-8">
            {WEEKEND_DAYS.map((day) => {
              const dayEvents = eventsForDay(events, day);
              const dateLabel = dayHeadingDate(events, day);
              return (
                <section key={day} id={`day-${day}`} className="scroll-mt-28">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {WEEKEND_DAY_LABEL[day]}
                    </h2>
                    {dateLabel ? (
                      <p className="text-sm text-[var(--muted)]">{dateLabel}</p>
                    ) : null}
                  </div>
                  {dayEvents.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {dayEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm text-[var(--muted)]">
                      Nothing listed for {WEEKEND_DAY_LABEL[day]}.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <section className="card relative overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(125,211,252,0.22),transparent_42%),radial-gradient(circle_at_82%_100%,rgba(196,181,253,0.2),transparent_40%),radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.1),transparent_46%)]" />
          <div className="relative">
            <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
              {WEEKEND_DAYS.map((day) => (
                <span
                  key={day}
                  className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${DAY_TEXT[day]}`}
                >
                  {day}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The weekend is wide open
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              No events in this drop for {weekendRange.label}. New cards show up
              here when the Thursday list lands.
            </p>
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-[var(--muted)]">
        {hasSamples
          ? "Sample cards for a quick look. A Thursday drop replaces them."
          : "A short list for the weekend."}
      </footer>
    </div>
  );
}
