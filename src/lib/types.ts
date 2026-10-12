export type CalendarEvent = {
  time: string;
  title: string;
};

export type SiteStatsPage = {
  path: string;
  views: number;
  label?: string;
};

export type SiteStatsWindow = {
  last24h: number | null;
  last7d: number | null;
};

export type SiteStats = {
  label: string;
  source: string;
  asOf: string;
  views: SiteStatsWindow;
  visitors?: SiteStatsWindow;
  topPages: SiteStatsPage[];
  note?: string;
};

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type FunMode = "week" | "weekend";

export type FunRange = {
  /** First day covered, YYYY-MM-DD (Eastern calendar date). */
  start: string;
  /** Last day covered, YYYY-MM-DD, inclusive. */
  end: string;
  /** Display line. Built from start/end when the content leaves it out. */
  label: string;
};

export type FunEvent = {
  id: string;
  title: string;
  day: DayOfWeek;
  date?: string;
  venue: string;
  hook: string;
  url: string;
  imageUrl: string | null;
  tags: string[];
  startTime?: string;
  neighborhood?: string;
  sample: boolean;
};

export type FunDay = {
  day: DayOfWeek;
  /** YYYY-MM-DD when the day sits inside the range. */
  date?: string;
  events: FunEvent[];
};

export type FunDrop = {
  mode: FunMode;
  heading: string;
  range: FunRange;
  updatedNote?: string;
  /** "content" when fun.json's mode/range were used, "computed" when they were missing, invalid, or expired. */
  source: "content" | "computed";
  /** True when fun.json's range ended before Eastern today. */
  stale: boolean;
  days: FunDay[];
  events: FunEvent[];
};

export type SurpriseKind =
  | "golden-hour"
  | "word"
  | "apod"
  | "sky"
  | "on-this-day"
  | "anime"
  | "show"
  | "port"
  | "note"
  | "fact";

export type SurpriseLink = {
  label: string;
  url: string;
};

export type Surprise = {
  kind: SurpriseKind;
  eyebrow: string;
  title: string;
  body: string;
  /** https only. Allowed hosts go through next/image; other https hosts use a plain img. */
  imageUrl?: string;
  imageAlt?: string;
  audioUrl?: string;
  link?: SurpriseLink;
  source?: SurpriseLink;
  /** CSS hex color, like "#fbbf24". */
  accent?: string;
};

export type TodayBrief = {
  greeting: string;
  date: string;
  dateDisplay: string;
  calendar: {
    note: string;
    events: CalendarEvent[];
  };
  projectMove: {
    title: string;
    body: string;
  };
  tip: {
    title: string;
    body: string;
  };
  cruise: {
    name: string;
    targetDate: string;
    label: string;
  };
  weather: {
    lat: number;
    lon: number;
    label: string;
  };
  siteStats?: SiteStats;
  surprise?: Surprise;
};
