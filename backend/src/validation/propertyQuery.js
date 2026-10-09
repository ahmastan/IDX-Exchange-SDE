// Validates the query string for GET /api/properties.
// Returns { value } with clean, typed values, or { errors } with one message per bad param.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const WHOLE_NUMBER = /^\d+$/;
const DECIMAL_NUMBER = /^\d+(\.\d+)?$/;
const ZIPCODE = /^\d{5}$/;

function parsePropertyQuery(query) {
  const errors = [];
  const value = { limit: DEFAULT_LIMIT, offset: 0, filters: {} };

  // Reads a param as a trimmed string. Empty means "not provided" so a form
  // that submits blank fields doesn't get rejected.
  function read(name) {
    const raw = query[name];
    if (raw === undefined) return undefined;
    if (typeof raw !== "string") {
      errors.push(`${name} must be a single value`);
      return undefined;
    }
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  function wholeNumber(name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    const raw = read(name);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (!WHOLE_NUMBER.test(raw) || n < min || n > max) {
      errors.push(
        max === Number.MAX_SAFE_INTEGER
          ? `${name} must be a whole number of ${min} or more`
          : `${name} must be a whole number between ${min} and ${max}`
      );
      return undefined;
    }
    return n;
  }

  const limit = wholeNumber("limit", { min: 1, max: MAX_LIMIT });
  if (limit !== undefined) value.limit = limit;

  const offset = wholeNumber("offset");
  if (offset !== undefined) value.offset = offset;

  const city = read("city");
  if (city !== undefined) {
    if (city.length > 50) errors.push("city must be 50 characters or fewer");
    else value.filters.city = city;
  }

  const zipcode = read("zipcode");
  if (zipcode !== undefined) {
    if (!ZIPCODE.test(zipcode)) errors.push("zipcode must be exactly 5 digits");
    else value.filters.zipcode = zipcode;
  }

  const minPrice = wholeNumber("minPrice");
  if (minPrice !== undefined) value.filters.minPrice = minPrice;

  const maxPrice = wholeNumber("maxPrice");
  if (maxPrice !== undefined) value.filters.maxPrice = maxPrice;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    errors.push("minPrice cannot be greater than maxPrice");
  }

  const beds = wholeNumber("beds", { max: 100 });
  if (beds !== undefined) value.filters.beds = beds;

  // Baths can be fractional (e.g. 2.5)
  const baths = read("baths");
  if (baths !== undefined) {
    const n = Number(baths);
    if (!DECIMAL_NUMBER.test(baths) || n > 100) {
      errors.push("baths must be a number between 0 and 100 (e.g. 2 or 2.5)");
    } else {
      value.filters.baths = n;
    }
  }

  return errors.length ? { errors } : { value };
}

module.exports = { parsePropertyQuery, DEFAULT_LIMIT, MAX_LIMIT };
