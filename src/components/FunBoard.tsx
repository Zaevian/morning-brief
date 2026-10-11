import type { FunDrop } from "@/lib/types";
import { DAY_LABEL, formatShortDate } from "@/lib/fun";
import { DAY_TEXT } from "@/lib/day-style";
import { EventCard } from "@/components/EventCard";

export function FunBoard({ fun }: { fun: FunDrop }) {
  const { heading, mode, range, updatedNote, days, events, stale } = fun;
  const hasEvents = events.length > 0;
  const hasSamples = events.some((event) => event.sample);
  const span = mode === "week" ? "week" : "weekend";

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Fun</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-[var(--muted)]">{range.label}</p>
        {updatedNote ? (
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {updatedNote}
          </p>
        ) : null}
      </header>

      {hasSamples ? (
        <p className="mb-5 rounded-2xl border border-[rgba(251,191,36,0.28)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-sm leading-relaxed text-[var(--warm)]">
          Sample list. These cards are placeholders until a real list replaces them.
        </p>
      ) : null}

      {hasEvents ? (
        <>
          <nav aria-label="Days" className="mb-6 flex flex-wrap gap-2">
            {days.map((group) => (
              <a
                key={group.day}
                href={`#day-${group.day}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm transition hover:border-white/20 hover:bg-white/10"
              >
                <span className={`font-medium ${DAY_TEXT[group.day]}`}>
                  {DAY_LABEL[group.day]}
                </span>
                <span className="tabular-nums text-xs text-[var(--muted)]">
                  {group.events.length}
                </span>
              </a>
            ))}
          </nav>

          <div className="grid gap-8">
            {days.map((group) => {
              const dateIso = group.date ?? group.events.find((event) => event.date)?.date;
              const dateLabel = dateIso ? formatShortDate(dateIso) : undefined;
              return (
                <section key={group.day} id={`day-${group.day}`} className="scroll-mt-28">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {DAY_LABEL[group.day]}
                    </h2>
                    {dateLabel ? (
                      <p className="text-sm text-[var(--muted)]">{dateLabel}</p>
                    ) : null}
                  </div>
                  {group.events.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.events.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm text-[var(--muted)]">
                      Nothing listed for {DAY_LABEL[group.day]}.
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
              {days.map((group) => (
                <span
                  key={group.day}
                  className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${DAY_TEXT[group.day]}`}
                >
                  {group.day}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The {span} is wide open
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {stale
                ? `Waiting on a fresh list for ${range.label}. New cards show up here when the morning drop lands.`
                : `Nothing listed for ${range.label}. New cards show up here when the morning drop lands.`}
            </p>
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-[var(--muted)]">
        {hasSamples
          ? "Sample cards for a quick look. The next drop replaces them."
          : `A short list for the ${span}.`}
      </footer>
    </div>
  );
}
