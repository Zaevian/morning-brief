import type { OttomanLesson } from "@/lib/types";

function parseLesson(value: unknown): OttomanLesson | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const r = value as Record<string, unknown>;
  const lessonNumber = r.lessonNumber;
  const totalLessons = r.totalLessons;
  const chapterTitle = typeof r.chapterTitle === "string" ? r.chapterTitle.trim() : "";
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  if (
    typeof lessonNumber !== "number" ||
    typeof totalLessons !== "number" ||
    !Number.isInteger(lessonNumber) ||
    !Number.isInteger(totalLessons) ||
    lessonNumber < 1 ||
    totalLessons < lessonNumber ||
    !chapterTitle ||
    !summary ||
    typeof r.link !== "string"
  ) {
    return undefined;
  }
  let link: string;
  try {
    const url = new URL(r.link.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    link = url.toString();
  } catch {
    return undefined;
  }
  return { lessonNumber, totalLessons, chapterTitle, summary, link };
}

export function OttomanCard({ lesson }: { lesson?: unknown }) {
  const data = parseLesson(lesson);
  if (!data) return null;
  const progress = Math.round((data.lessonNumber / data.totalLessons) * 100);

  return (
    <section className="card p-5 sm:p-6 border-[rgba(248,113,113,0.25)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[#fca5a5]">
          Ottoman lesson {data.lessonNumber} of {data.totalLessons}
        </p>
        <span
          className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Course progress"
          aria-valuemin={0}
          aria-valuemax={data.totalLessons}
          aria-valuenow={data.lessonNumber}
        >
          <span
            className="block h-full rounded-full bg-[#fca5a5]"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>
      <h2 className="mb-2 text-lg font-semibold">{data.chapterTitle}</h2>
      <p className="leading-relaxed text-[var(--muted)]">{data.summary}</p>
      <a
        href={data.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fca5a5]"
      >
        Open lesson {data.lessonNumber}
      </a>
    </section>
  );
}
