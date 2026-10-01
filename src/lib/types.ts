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
};
