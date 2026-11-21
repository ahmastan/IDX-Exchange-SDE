// Turns LMD_MP_Latitude / LMD_MP_Longitude into a number, or null when it is
// missing or out of range. mysql2 can return DECIMAL columns as strings.
function toCoordinate(value, limit) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

// Both coordinates, or null if either is missing. 0,0 counts as missing too:
// it is the placeholder some rows hold, and it is in the Atlantic Ocean.
export function getCoordinates(latitude, longitude) {
  const lat = toCoordinate(latitude, 90);
  const lng = toCoordinate(longitude, 180);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}
