// Helpers for rets_openhouse rows from GET /api/properties/:id/openhouses.
// The API returns OpenHouseDate as "YYYY-MM-DD", OH_StartTime/OH_EndTime as
// "HH:MM:SS", and all_data as the raw JSON text from the database.

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  // The Date below is built at UTC midnight, so format it in UTC too
  timeZone: "UTC",
});

// "2026-09-20" -> "Sun, Sep 20, 2026", or null if it isn't a valid date.
// Don't use new Date("2026-09-20"): that is midnight UTC, which is still the
// previous evening in California, so the open house would show a day early.
export function formatOpenHouseDate(value) {
  const match = DATE.exec(String(value ?? "").trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects dates like 2026-02-31, which Date.UTC would roll into March
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return dateFormatter.format(date);
}

// "13:00:00" -> "1:00 PM", or null if it isn't a valid time.
export function formatTime(value) {
  const match = TIME.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return null;
  const suffix = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

// "1:00 PM – 4:00 PM", just one end if the other is missing, or null.
export function formatTimeRange(start, end) {
  const from = formatTime(start);
  const to = formatTime(end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? null;
}

// OpenHouseRemarks lives inside the all_data JSON blob, not in its own column.
// all_data arrives as a JSON string (the column is LONGTEXT), but an object is
// accepted too in case the API ever parses it. Returns the trimmed remarks, or
// null when there are none or all_data can't be read.
export function getOpenHouseRemarks(allData) {
  let data = allData;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const remarks = data.OpenHouseRemarks;
  return typeof remarks === "string" && remarks.trim() ? remarks.trim() : null;
}

// True when the open house date is before `today` ("YYYY-MM-DD", local time).
// String comparison works because both are zero-padded ISO dates.
export function isPastOpenHouse(value, today = localToday()) {
  return DATE.test(String(value ?? "").trim()) && String(value).trim() < today;
}

function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
