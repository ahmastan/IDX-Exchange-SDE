const pool = require("../db");
const { parsePhotos } = require("./propertySearch");

// Returns the full property row, or null if no listing has this ID.
// A few listing IDs appear on more than one row in the dump (identical
// copies); the newest row wins so the result is deterministic.
async function getPropertyById(listingId) {
  const [rows] = await pool.query(
    "SELECT * FROM rets_property WHERE L_ListingID = ? ORDER BY id DESC LIMIT 1",
    [listingId]
  );
  if (rows.length === 0) return null;
  return { ...rows[0], L_Photos: parsePhotos(rows[0].L_Photos) };
}

async function propertyExists(listingId) {
  const [rows] = await pool.query("SELECT 1 FROM rets_property WHERE L_ListingID = ? LIMIT 1", [
    listingId,
  ]);
  return rows.length > 0;
}

// all_data is a JSON blob (OpenHouseRemarks lives inside it) and is returned
// as-is for the frontend to parse. id breaks ties between identical times.
async function getOpenHousesByListingId(listingId) {
  const [rows] = await pool.query(
    `SELECT id, L_ListingID, OpenHouseDate, OH_StartTime, OH_EndTime, all_data
     FROM rets_openhouse
     WHERE L_ListingID = ?
     ORDER BY OpenHouseDate, OH_StartTime, id`,
    [listingId]
  );
  return rows;
}

module.exports = { getPropertyById, propertyExists, getOpenHousesByListingId };
