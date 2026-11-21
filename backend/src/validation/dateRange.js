// Validates ?startDate=&endDate= for GET /api/openhouses.
// Returns { value: { startDate, endDate } } or { errors: [...] }.

// Up to one year (366 days covers a leap year) per request. The calendar UI
// only asks for six weeks at a time; the cap stops a request like
// 1900-01-01..9999-12-31 from asking for every open house ever.
const MAX_RANGE_DAYS = 366;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "2026-09-20" -> UTC milliseconds, or null if it isn't a real calendar date.
// Built from its parts in UTC so no server timezone can shift the day, and
// checked afterwards because Date.UTC quietly rolls 2026-02-31 into March.
function parseDate(text) {
  const match = DATE.exec(text);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return ms;
}

function parseDateRange(query) {
  const errors = [];
  const parsed = {};

  for (const name of ["startDate", "endDate"]) {
    const raw = query[name];
    if (raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
      errors.push(`${name} is required (YYYY-MM-DD)`);
    } else if (typeof raw !== "string") {
      errors.push(`${name} must be a single value`);
    } else {
      const ms = parseDate(raw.trim());
      if (ms === null) errors.push(`${name} must be a real date in YYYY-MM-DD format`);
      else parsed[name] = { text: raw.trim(), ms };
    }
  }
  if (errors.length) return { errors };

  const { startDate, endDate } = parsed;
  if (startDate.ms > endDate.ms) return { errors: ["startDate cannot be after endDate"] };
  // Inclusive day count: the same start and end date is one day
  const days = (endDate.ms - startDate.ms) / MS_PER_DAY + 1;
  if (days > MAX_RANGE_DAYS) {
    return { errors: [`The date range can be at most ${MAX_RANGE_DAYS} days`] };
  }

  return { value: { startDate: startDate.text, endDate: endDate.text } };
}

module.exports = { parseDateRange, MAX_RANGE_DAYS };
