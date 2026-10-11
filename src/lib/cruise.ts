const easternYmd = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function ymdToUtcMs(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysUntil(targetDate: string, fromDate = new Date()): number {
  const todayEastern = easternYmd.format(fromDate);
  const diff = ymdToUtcMs(targetDate) - ymdToUtcMs(todayEastern);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
