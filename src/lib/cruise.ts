export function daysUntil(targetDate: string, fromDate = new Date()): number {
  const target = new Date(`${targetDate}T00:00:00`);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
