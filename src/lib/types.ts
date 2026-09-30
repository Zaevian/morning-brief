export type CalendarEvent = {
  time: string;
  title: string;
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
};
