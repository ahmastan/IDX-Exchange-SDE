// Date math for the open house calendar. Calendar days are handled as
// "YYYY-MM-DD" strings and computed in UTC, so no timezone or daylight-saving
// change can move an event to the wrong day. (new Date("2026-09-20") is UTC
// midnight, which is still Sep 19 in California.)

const MONTH = /^(\d{4})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_IN_GRID = 42; // six weeks, enough for any month

const pad = (n) => String(n).padStart(2, "0");

// { year, month } uses a 1-based month: September 2026 is { 2026, 9 }
export function monthKey({ year, month }) {
  return `${year}-${pad(month)}`;
}

// "2026-09" -> { year: 2026, month: 9 }, or null when it isn't a real month
export function parseMonth(value) {
  const match = MONTH.exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 9999) return null;
  return { year, month };
}

export function currentMonth(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// Today's date in the viewer's own timezone
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function shiftMonth({ year, month }, delta) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function isoFromUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// The 42 days shown for a month, starting on the Sunday on or before the 1st.
// Each day is { date: "YYYY-MM-DD", day: 1-31, inMonth }.
export function monthGrid({ year, month }) {
  const first = Date.UTC(year, month - 1, 1);
  const start = first - new Date(first).getUTCDay() * MS_PER_DAY;
  return Array.from({ length: DAYS_IN_GRID }, (_, i) => {
    const ms = start + i * MS_PER_DAY;
    const d = new Date(ms);
    return { date: isoFromUtc(ms), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month - 1 };
  });
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// { 2026, 9 } -> "September 2026"
export function formatMonth({ year, month }) {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

// Open houses grouped by OpenHouseDate, keeping the API's order (by start
// time) within each day.
export function groupByDate(openHouses) {
  const byDate = new Map();
  for (const openHouse of openHouses) {
    const list = byDate.get(openHouse.OpenHouseDate);
    if (list) list.push(openHouse);
    else byDate.set(openHouse.OpenHouseDate, [openHouse]);
  }
  return byDate;
}
