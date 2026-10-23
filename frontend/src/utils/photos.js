// L_Photos is stored in MySQL as a JSON array of URLs in a text column. The
// API already parses it, but this stays defensive so the UI never crashes on
// whatever shape it receives. In the current data 211 listings have an empty
// string instead of "[]", and any row could in principle hold null, malformed
// JSON, a non-array value, or blank entries.

function isUsableUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

// Returns the photo list as an array of URL strings, never throwing.
export function parsePhotos(raw) {
  let photos = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      photos = JSON.parse(trimmed);
    } catch {
      // Not JSON; accept it only if it is a bare URL
      return isUsableUrl(trimmed) ? [trimmed] : [];
    }
  }

  if (!Array.isArray(photos)) return [];
  return photos.filter(isUsableUrl).map((url) => url.trim());
}

// The first photo URL, or null when the listing has none.
export function getFirstPhoto(raw) {
  return parsePhotos(raw)[0] ?? null;
}
