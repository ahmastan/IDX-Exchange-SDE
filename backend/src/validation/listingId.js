// Validates the :id route param for /api/properties/:id endpoints.
// Every L_ListingID in the data is a 9-10 digit number; 20 leaves headroom
// while still rejecting oversized input before it reaches the database.
const MAX_ID_LENGTH = 20;
const LISTING_ID = new RegExp(`^\\d{1,${MAX_ID_LENGTH}}$`);

function parseListingId(raw) {
  if (typeof raw !== "string" || !LISTING_ID.test(raw)) {
    return { error: `Listing ID must be a number of 1 to ${MAX_ID_LENGTH} digits` };
  }
  // Kept as a string on purpose: L_ListingID is a VARCHAR, and comparing it to
  // a number makes MySQL convert every row and skip the index.
  return { value: raw };
}

module.exports = { parseListingId, MAX_ID_LENGTH };
