import weekendData from "../../content/weekend.json";
import type {
  WeekendDay,
  WeekendDrop,
  WeekendEvent,
  WeekendRange,
} from "@/lib/types";

export const WEEKEND_DAYS: WeekendDay[] = ["Fri", "Sat", "Sun"];

export const WEEKEND_DAY_LABEL: Record<WeekendDay, string> = {
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isWeekendDay(value: unknown): value is WeekendDay {
  return value === "Fri" || value === "Sat" || value === "Sun";
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

function parseEvent(value: unknown, index: number): WeekendEvent | undefined {
  if (!isRecord(value)) return undefined;
  const title = asString(value.title);
  const venue = asString(value.venue);
  const hook = asString(value.hook);
  const url = httpUrl(value.url);
  if (!title || !venue || !hook || !url || !isWeekendDay(value.day)) {
    return undefined;
  }

  const tags = parseTags(value.tags);
  const sample =
    value.sample === true ||
    tags.some((tag) => tag.toLowerCase() === "sample");
  const date = asString(value.date);
  const id = asString(value.id) ?? `${value.day}-${index + 1}-${slug(title)}`;

  return {
    id,
    title,
    day: value.day,
    date: date && isIsoDate(date) ? date : undefined,
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

function parseRange(value: unknown): WeekendRange {
  const record = isRecord(value) ? value : {};
  const startDate = asString(record.startDate);
  const endDate = asString(record.endDate);
  return {
    label: asString(record.label) ?? "This weekend",
    startDate: startDate && isIsoDate(startDate) ? startDate : undefined,
    endDate: endDate && isIsoDate(endDate) ? endDate : undefined,
    updatedNote: asString(record.updatedNote),
  };
}

export function parseWeekend(raw: unknown): WeekendDrop {
  const record = isRecord(raw) ? raw : {};
  const eventsRaw = Array.isArray(record.events) ? record.events : [];
  const events: WeekendEvent[] = [];
  for (const [index, item] of eventsRaw.entries()) {
    const event = parseEvent(item, index);
    if (event) events.push(event);
  }
  return {
    weekendRange: parseRange(record.weekendRange),
    events,
  };
}

export function eventsForDay(
  events: WeekendEvent[],
  day: WeekendDay
): WeekendEvent[] {
  return events.filter((event) => event.day === day);
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatWeekendDate(iso: string): string | undefined {
  if (!isIsoDate(iso)) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  return shortDate.format(new Date(Date.UTC(year, month - 1, day)));
}

export function loadWeekendDrop(): WeekendDrop {
  return parseWeekend(weekendData);
}
