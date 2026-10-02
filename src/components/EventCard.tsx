import type { WeekendEvent } from "@/lib/types";
import { WEEKEND_DAY_LABEL } from "@/lib/weekend";
import { EventImage } from "@/components/EventImage";

const DAY_CHIP: Record<WeekendEvent["day"], string> = {
  Fri: "border-[rgba(125,211,252,0.4)] bg-[rgba(125,211,252,0.14)] text-[var(--accent)]",
  Sat: "border-[rgba(196,181,253,0.4)] bg-[rgba(196,181,253,0.14)] text-[var(--accent-2)]",
  Sun: "border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.14)] text-[var(--warm)]",
};

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12"
        strokeLinecap="round"
      />
      <path d="M10 10 16 4" strokeLinecap="round" />
      <path d="M12 4h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EventCard({ event }: { event: WeekendEvent }) {
  const meta = [event.neighborhood, event.startTime].filter(Boolean).join(" · ");
  const tags = event.tags.filter((tag) => tag.toLowerCase() !== "sample");
  const linkLabel = event.sample ? "Sample link" : "View event";
  const ariaLabel = `${event.sample ? "Sample event: " : ""}${event.title}, ${WEEKEND_DAY_LABEL[event.day]} at ${event.venue}. ${linkLabel}, opens in a new tab.`;

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden motion-safe:transition motion-safe:duration-200 hover:border-white/20 motion-safe:hover:-translate-y-0.5 focus-within:border-white/25">
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="absolute inset-0 z-20 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      />
      <div className="relative aspect-[16/10] overflow-hidden">
        <EventImage key={event.imageUrl ?? "placeholder"} src={event.imageUrl} day={event.day} />
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${DAY_CHIP[event.day]}`}
          >
            {event.day}
          </span>
          {event.sample ? (
            <span className="rounded-full border border-[rgba(251,191,36,0.45)] bg-[rgba(11,16,32,0.72)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--warm)]">
              Sample
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {meta ? (
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            {meta}
          </p>
        ) : null}
        <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight break-words">
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--accent)] break-words">{event.venue}</p>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
          {event.hook}
        </p>
        {tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[var(--muted)]"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
          {linkLabel}
          <ExternalIcon />
        </p>
      </div>
    </article>
  );
}
