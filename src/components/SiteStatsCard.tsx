import type { SiteStats } from "@/lib/types";

const asOfFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const countFormat = new Intl.NumberFormat("en-US");

function formatCount(value: number | null): string {
  if (value === null) return "\u2014";
  return countFormat.format(value);
}

function formatAsOf(asOf: string): string {
  const date = new Date(asOf);
  if (Number.isNaN(date.getTime())) return asOf;
  return asOfFormat.format(date);
}

function StatTile({
  caption,
  value,
}: {
  caption: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {caption}
      </p>
      <p
        className="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
        aria-label={value === null ? "pending" : undefined}
      >
        {formatCount(value)}
      </p>
    </div>
  );
}

function StatGroup({
  title,
  window,
}: {
  title: string;
  window: SiteStats["views"];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatTile caption="Last 24 hours" value={window.last24h} />
        <StatTile caption="Last 7 days" value={window.last7d} />
      </div>
    </div>
  );
}

export function SiteStatsCard({ stats }: { stats: SiteStats }) {
  const hasTopPages = stats.topPages.length > 0;

  return (
    <section className="card p-5 sm:p-6 border-[rgba(134,239,172,0.22)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--good)] mb-2">
        Site stats
      </p>
      <h2 className="text-lg font-semibold mb-4">{stats.label}</h2>

      <div className="grid gap-4">
        <StatGroup title="Views" window={stats.views} />
        {stats.visitors != null ? (
          <StatGroup title="Visitors" window={stats.visitors} />
        ) : null}
      </div>

      {hasTopPages ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] mb-2">
            Top pages
          </p>
          <ol className="space-y-2">
            {stats.topPages.map((page) => (
              <li
                key={`${page.path}-${page.label ?? ""}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {page.label ?? page.path}
                  </span>
                  {page.label ? (
                    <span className="text-[var(--muted)] ml-2">{page.path}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">
                  {countFormat.format(page.views)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {stats.note ? (
        <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">
          {stats.note}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-[var(--muted)]">
        {stats.source}
        {" · "}
        as of {formatAsOf(stats.asOf)}
      </p>
    </section>
  );
}
