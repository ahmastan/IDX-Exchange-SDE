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

// RETS enum values are PascalCase and comma-separated, e.g.
// "MainLevelPrimary,PrimarySuite" -> "Main Level Primary, Primary Suite".
// Returns null for blank values and for "None".
export function formatEnumList(value) {
  if (typeof value !== "string") return null;
  const items = value
    .split(",")
    .map((item) =>
      item
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    )
    .filter((item) => item && item.toLowerCase() !== "none");
  return items.length ? items.join(", ") : null;
}

// Yes/No flags come back as 1/0, "1"/"0", or "" (unknown). Returns "Yes",
// "No", or null when unknown.
export function formatYesNo(value) {
  if (value === 1 || value === "1" || value === true) return "Yes";
  if (value === 0 || value === "0" || value === false) return "No";
  return null;
}
