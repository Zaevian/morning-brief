import funData from "../../content/fun.json";
import type {
  DayOfWeek,
  FunDay,
  FunDrop,
  FunEvent,
  FunMode,
} from "@/lib/types";

/** Index matches Date#getUTCDay(): 0 = Sunday. */
const DAYS_BY_INDEX: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DAY_LABEL: Record<DayOfWeek, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export const FUN_HEADING: Record<FunMode, string> = {
  week: "Fun this week",
  weekend: "Fun this weekend",
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const easternYmd = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in America/New_York as YYYY-MM-DD. */
export function easternToday(now = new Date()): string {
  return easternYmd.format(now);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function isoDate(value: unknown): string | undefined {
  const raw = asString(value);
  return raw && isIsoDate(raw) ? raw : undefined;
}

function toUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

export function dayOfWeek(iso: string): DayOfWeek {
  return DAYS_BY_INDEX[toUtc(iso).getUTCDay()];
}

/** Accepts Mon..Sun, full names, any case. */
function parseDay(value: unknown): DayOfWeek | undefined {
  const raw = asString(value)?.toLowerCase();
  if (!raw) return undefined;
  return DAYS_BY_INDEX.find(
    (day) => raw === day.toLowerCase() || raw === DAY_LABEL[day].toLowerCase()
  );
}

function httpUrl(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function httpsUrl(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    const tag = asString(item);
    if (!tag) continue;
    tags.push(tag);
    if (tags.length >= 8) break;
  }
  return tags;
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 48) || "event";
}

function parseEvent(value: unknown, index: number): FunEvent | undefined {
  if (!isRecord(value)) return undefined;
  const title = asString(value.title);
  const venue = asString(value.venue);
  const hook = asString(value.hook);
  const url = httpUrl(value.url);
  const date = isoDate(value.date);
  // A valid date decides the weekday; otherwise `day` must be a real weekday.
  const day = date ? dayOfWeek(date) : parseDay(value.day);
  if (!title || !venue || !hook || !url || !day) return undefined;

  const tags = parseTags(value.tags);
  const sample =
    value.sample === true || tags.some((tag) => tag.toLowerCase() === "sample");

  return {
    id: asString(value.id) ?? `${day}-${index + 1}-${slug(title)}`,
    title,
    day,
    date,
    venue,
    hook,
    url,
    imageUrl: httpsUrl(value.imageUrl),
    tags,
    startTime: asString(value.startTime),
    neighborhood: asString(value.neighborhood),
    sample,
  };
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatShortDate(iso: string): string | undefined {
  return isIsoDate(iso) ? shortDate.format(toUtc(iso)) : undefined;
}

/** "Sun, Oct 11, 2026", "Oct 12-15, 2026", or "Oct 30 - Nov 1, 2026". */
export function formatRangeLabel(start: string, end: string): string {
  if (start === end) return longDate.format(toUtc(start));
  const a = toUtc(start);
  const b = toUtc(end);
  const year = b.getUTCFullYear();
  if (a.getUTCFullYear() === year && a.getUTCMonth() === b.getUTCMonth()) {
    return `${shortDate.format(a)}-${b.getUTCDate()}, ${year}`;
  }
  const startText =
    a.getUTCFullYear() === year ? shortDate.format(a) : `${shortDate.format(a)}, ${a.getUTCFullYear()}`;
  return `${startText} - ${shortDate.format(b)}, ${year}`;
}

/** Mon-Thu: today through Thursday ("week"). Fri-Sun: today through Sunday ("weekend"). */
export function computeModeAndRange(today: string): { mode: FunMode; start: string; end: string } {
  const index = toUtc(today).getUTCDay(); // 0 = Sun
  if (index >= 1 && index <= 4) {
    return { mode: "week", start: today, end: addDays(today, 4 - index) };
  }
  const toSunday = index === 0 ? 0 : 7 - index;
  return { mode: "weekend", start: today, end: addDays(today, toSunday) };
}

function modeFromStart(start: string): FunMode {
  const index = toUtc(start).getUTCDay();
  return index >= 1 && index <= 4 ? "week" : "weekend";
}

type ContentWindow = { mode: FunMode; start: string; end: string; label?: string };

function parseContentWindow(record: Record<string, unknown>): ContentWindow | undefined {
  // New schema: { mode, range: { start, end, label? } }.
  // Legacy schema: { weekendRange: { startDate, endDate, label } } still reads as a weekend.
  const range = isRecord(record.range) ? record.range : undefined;
  const legacy = isRecord(record.weekendRange) ? record.weekendRange : undefined;
  const start = isoDate(range?.start) ?? isoDate(legacy?.startDate);
  const end = isoDate(range?.end) ?? isoDate(legacy?.endDate);
  if (!start || !end) return undefined;
  const span = daysBetween(start, end);
  if (span < 0 || span > 6) return undefined;
  const mode: FunMode =
    record.mode === "week" || record.mode === "weekend"
      ? record.mode
      : legacy && !range
        ? "weekend"
        : modeFromStart(start);
  return { mode, start, end, label: asString(range?.label) ?? asString(legacy?.label) };
}

function groupDays(events: FunEvent[], start: string, end: string): FunDay[] {
  const days: FunDay[] = [];
  for (let i = 0; i <= daysBetween(start, end); i++) {
    const date = addDays(start, i);
    const day = dayOfWeek(date);
    days.push({
      day,
      date,
      events: events.filter((event) => (event.date ? event.date === date : event.day === day)),
    });
  }
  // Events whose weekday is outside the range still show, after the range, in week order from start.
  const startIndex = toUtc(start).getUTCDay();
  const extra = events.filter(
    (event) => !days.some((group) => group.events.includes(event))
  );
  const extraDays = [...new Set(extra.map((event) => event.day))].sort(
    (a, b) =>
      ((DAYS_BY_INDEX.indexOf(a) - startIndex + 7) % 7) -
      ((DAYS_BY_INDEX.indexOf(b) - startIndex + 7) % 7)
  );
  for (const day of extraDays) {
    days.push({ day, events: extra.filter((event) => event.day === day) });
  }
  return days;
}

export function parseFun(raw: unknown, now = new Date()): FunDrop {
  const record = isRecord(raw) ? raw : {};
  const today = easternToday(now);
  const eventsRaw = Array.isArray(record.events) ? record.events : [];
  const parsed: FunEvent[] = [];
  for (const [index, item] of eventsRaw.entries()) {
    const event = parseEvent(item, index);
    if (event) parsed.push(event);
  }

  const content = parseContentWindow(record);
  const stale = content ? content.end < today : false;
  const useContent = content !== undefined && !stale;
  const window = useContent ? content : computeModeAndRange(today);

  // Past-dated events never show. When we fell back to the computed window,
  // only events with a date inside it can be trusted to be current.
  const events = parsed.filter((event) => {
    if (event.date && event.date < today) return false;
    if (!useContent) return event.date !== undefined && event.date <= window.end;
    return true;
  });

  const label =
    (useContent ? content.label : undefined) ?? formatRangeLabel(window.start, window.end);

  return {
    mode: window.mode,
    heading: FUN_HEADING[window.mode],
    range: { start: window.start, end: window.end, label },
    updatedNote: useContent ? asString(record.updatedNote) : undefined,
    source: useContent ? "content" : "computed",
    stale,
    // Days already past drop off the board; the range label stays as written.
    days: groupDays(events, window.start < today ? today : window.start, window.end),
    events,
  };
}

export function loadFunDrop(now = new Date()): FunDrop {
  return parseFun(funData, now);
}
