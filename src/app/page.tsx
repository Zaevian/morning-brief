import today from "../../content/today.json";
import type { SiteStats, TodayBrief } from "@/lib/types";
import { fetchTallahasseeWeather } from "@/lib/weather";
import { WeatherCard } from "@/components/WeatherCard";
import { CruiseCountdown } from "@/components/CruiseCountdown";
import { SiteStatsCard } from "@/components/SiteStatsCard";

type BriefExtras = {
  gradArena?: string;
  language?: string;
  cruiseNote?: string;
  weatherNote?: string;
};

const brief = today as TodayBrief & { extras?: BriefExtras };

function joinCopy(note: string | undefined, extra: string | undefined): string | undefined {
  const parts = [note, extra].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export default async function Home() {
  const weather = await fetchTallahasseeWeather(
    brief.weather.lat,
    brief.weather.lon
  );
  const siteStats: SiteStats | undefined = brief.siteStats
    ? {
        ...brief.siteStats,
        note: joinCopy(brief.siteStats.note, brief.extras?.gradArena),
      }
    : undefined;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
      <header className="mb-8 sm:mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
          Morning brief
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          {brief.greeting}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{brief.dateDisplay}</p>
      </header>

      <div className="grid gap-4 sm:gap-5">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)] mb-1">
                Calendar
              </p>
              <h2 className="text-lg font-semibold">Today&apos;s timeline</h2>
            </div>
            <span className="rounded-full border border-[var(--card-border)] bg-white/5 px-3 py-1 text-xs text-[var(--good)]">
              {brief.calendar.note}
            </span>
          </div>
          <ol className="relative space-y-0">
            {brief.calendar.events.map((event, idx) => (
              <li key={`${event.time}-${event.title}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(125,211,252,0.7)]" />
                  {idx < brief.calendar.events.length - 1 ? (
                    <span className="w-px flex-1 bg-white/10 my-1" />
                  ) : null}
                </div>
                <div className="pb-5 last:pb-0">
                  <p className="text-sm text-[var(--accent)] font-medium">
                    {event.time}
                  </p>
                  <p className="text-base mt-0.5">{event.title}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5 sm:p-6 border-[rgba(196,181,253,0.25)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-2)] mb-2">
            Project move
          </p>
          <h2 className="text-lg font-semibold mb-2">{brief.projectMove.title}</h2>
          <p className="text-[var(--muted)] leading-relaxed">
            {brief.projectMove.body}
          </p>
        </section>

        {siteStats != null ? <SiteStatsCard stats={siteStats} /> : null}

        <section className="card p-5 sm:p-6 border-[rgba(251,191,36,0.2)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--warm)] mb-2">
            Tip
          </p>
          <h2 className="text-lg font-semibold mb-2">{brief.tip.title}</h2>
          <p className="text-[var(--muted)] leading-relaxed">{brief.tip.body}</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <WeatherCard
            place={brief.weather.label}
            weather={weather}
            note={brief.extras?.weatherNote}
          />
          <CruiseCountdown
            name={brief.cruise.name}
            targetDate={brief.cruise.targetDate}
            label={brief.cruise.label}
            note={brief.extras?.cruiseNote}
          />
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-[var(--muted)]">
        Seeded for {brief.dateDisplay}. Built for focus, not noise.
      </footer>
    </main>
  );
}
