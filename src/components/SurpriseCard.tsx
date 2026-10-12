import Image from "next/image";
import type { CSSProperties } from "react";
import type { Surprise, SurpriseKind, SurpriseLink } from "@/lib/types";
import { isOptimizableEventImage } from "@/lib/image-hosts";

const KIND_ICON: Record<SurpriseKind, string> = {
  "golden-hour": "🌅",
  word: "📖",
  apod: "🔭",
  sky: "✨",
  "on-this-day": "🗓️",
  anime: "🎌",
  show: "📺",
  port: "⚓",
  note: "💌",
  fact: "💡",
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function safeUrl(value: unknown, httpsOnly: boolean): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.toString();
    if (!httpsOnly && url.protocol === "http:") return url.toString();
  } catch {
    // ignore
  }
  return undefined;
}

function safeLink(value: unknown): SurpriseLink | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const label = text(record.label);
  const url = safeUrl(record.url, false);
  return label && url ? { label, url } : undefined;
}

export function SurpriseCard({ surprise }: { surprise?: Surprise | null }) {
  if (!surprise || typeof surprise !== "object") return null;
  const title = text(surprise.title);
  const body = text(surprise.body);
  if (!title || !body) return null;

  const eyebrow = text(surprise.eyebrow) ?? "Today's surprise";
  const icon = KIND_ICON[surprise.kind as SurpriseKind] ?? "🎁";
  const imageUrl = safeUrl(surprise.imageUrl, true);
  const imageAlt = text(surprise.imageAlt) ?? "";
  const audioUrl = safeUrl(surprise.audioUrl, true);
  const link = safeLink(surprise.link);
  const source = safeLink(surprise.source);
  const accent = text(surprise.accent);
  const style =
    accent && HEX_COLOR.test(accent)
      ? ({ "--surprise-accent": accent } as CSSProperties)
      : undefined;

  return (
    <section className="surprise-frame" style={style} aria-label={eyebrow}>
      <div className="surprise-inner">
        {imageUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            {isOptimizableEventImage(imageUrl) ? (
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            ) : (
              // Hosts outside remotePatterns stay on a plain https img so a new host cannot fail the build.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
            )}
          </div>
        ) : null}
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl"
            >
              {icon}
            </span>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--surprise-accent)]">
              {eyebrow}
            </p>
          </div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          <p className="mt-2 leading-relaxed text-[var(--muted)]">{body}</p>
          {audioUrl ? (
            <audio controls preload="none" src={audioUrl} className="mt-4 w-full">
              <a href={audioUrl}>Listen</a>
            </audio>
          ) : null}
          {link || source ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {link ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--surprise-accent)]"
                >
                  {link.label}
                </a>
              ) : (
                <span />
              )}
              {source ? (
                <p className="text-xs text-[var(--muted)]">
                  Source:{" "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/25 underline-offset-2 hover:text-white"
                  >
                    {source.label}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
