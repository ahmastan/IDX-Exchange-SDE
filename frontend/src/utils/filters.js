// Shape of the filter form. Every value is a string because that's what form
// inputs produce; "" means the user left the field blank.
export const EMPTY_FILTERS = {
  city: "",
  zipcode: "",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
};

const ZIPCODE = /^\d{5}$/;
const WHOLE_NUMBER = /^\d+$/;

// Trims every value and drops the blank ones, so only filters the user
// actually set are sent to the API (a blank "city=" would match nothing).
export function cleanFilters(filters) {
  const cleaned = {};
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = String(value ?? "").trim();
    if (trimmed !== "") cleaned[key] = trimmed;
  }
  return cleaned;
}

// Checks cleaned filters against the same rules the backend enforces, so the
// user gets the message next to the form instead of a failed search.
// Returns an error message, or null when the filters are valid.
export function validateFilters(filters) {
  if (filters.zipcode !== undefined && !ZIPCODE.test(filters.zipcode)) {
    return "ZIP code must be exactly 5 digits.";
  }
  for (const [key, label] of [["minPrice", "Min price"], ["maxPrice", "Max price"]]) {
    if (filters[key] !== undefined && !WHOLE_NUMBER.test(filters[key])) {
      return `${label} must be a whole dollar amount.`;
    }
  }
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    Number(filters.minPrice) > Number(filters.maxPrice)
  ) {
    return "Min price can't be more than max price.";
  }
  return null;
}
