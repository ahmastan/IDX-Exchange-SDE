// Display helpers for property fields. Each returns null for a missing or
// non-numeric value so the caller decides what placeholder to show.

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  // mysql2 returns DECIMAL columns (like baths) as strings, e.g. "2.5"
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatPrice(value) {
  const n = toNumber(value);
  return n === null ? null : priceFormatter.format(n);
}

export function formatNumber(value) {
  const n = toNumber(value);
  return n === null ? null : numberFormatter.format(n);
}
