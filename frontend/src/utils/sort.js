// Sort choices for the listings page. sortBy values are the real
// rets_property column names the API whitelists:
//   L_SystemPrice = price, ListingContractDate = date listed,
//   LM_Int2_3 = sqft, L_Keyword2 = beds
// The option value packs both params ("L_SystemPrice:asc") so one <select>
// can drive them; "" is the API's default order.
export const DEFAULT_SORT = "";

export const SORT_OPTIONS = [
  { value: DEFAULT_SORT, label: "Default" },
  { value: "L_SystemPrice:asc", label: "Price: low to high" },
  { value: "L_SystemPrice:desc", label: "Price: high to low" },
  { value: "ListingContractDate:desc", label: "Newest listed" },
  { value: "ListingContractDate:asc", label: "Oldest listed" },
  { value: "LM_Int2_3:desc", label: "Square feet: largest" },
  { value: "LM_Int2_3:asc", label: "Square feet: smallest" },
  { value: "L_Keyword2:desc", label: "Beds: most" },
  { value: "L_Keyword2:asc", label: "Beds: fewest" },
];

const VALID = new Set(SORT_OPTIONS.map((option) => option.value));

// "L_SystemPrice:desc" -> { sortBy: "L_SystemPrice", sortOrder: "desc" }.
// Returns {} for the default (or anything unrecognised), so the request
// carries no sort params at all.
export function toSortParams(value) {
  if (!value || !VALID.has(value)) return {};
  const [sortBy, sortOrder] = value.split(":");
  return { sortBy, sortOrder };
}
