/**
 * The backend returns naive UTC datetimes ("2026-11-13T04:00:00", no "Z"),
 * so they must be parsed as UTC, not local time.
 */
export function parseApiDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

const relative = new Intl.RelativeTimeFormat("en-PH", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", "3 days ago", then a date. */
export function timeAgo(value: string, now = Date.now()): string {
  const diffS = Math.round((parseApiDate(value).getTime() - now) / 1000);
  const abs = Math.abs(diffS);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(diffS / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(diffS / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(diffS / 86_400), "day");
  return formatDate(value);
}

/** "Nov 13, 2026" in Philippine time. */
export function formatDate(value: string): string {
  return parseApiDate(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

/** "Nov 13, 2026, 12:00 PM" in Philippine time. */
export function formatDateTime(value: string): string {
  return parseApiDate(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-PH");
}

/** Morning/afternoon/evening greeting in Philippine time. */
export function greeting(now = new Date()): string {
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" })) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
