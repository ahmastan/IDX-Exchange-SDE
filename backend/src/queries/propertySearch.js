const pool = require("../db");

// Columns returned for each listing in search results. The RETS column names
// don't describe themselves, so the aliases are noted here:
//   L_SystemPrice = price, L_Keyword2 = beds, LM_Dec_3 = baths, LM_Int2_3 = sqft
const LIST_COLUMNS = [
  "L_ListingID",
  "L_DisplayId",
  "L_Address",
  "L_City",
  "L_State",
  "L_Zip",
  "L_SystemPrice",
  "L_Keyword2",
  "LM_Dec_3",
  "LM_Int2_3",
  "L_Photos",
  "LMD_MP_Latitude",
  "LMD_MP_Longitude",
  "YearBuilt",
  "LotSizeAcres",
].join(", ");

// Builds the WHERE clause from validated filters. Each condition and its value
// are pushed together, so the Nth "?" always lines up with the Nth value no
// matter which filters are present.
function buildWhereClause(filters) {
  const conditions = [];
  const values = [];

  if (filters.city !== undefined) {
    // City casing is inconsistent in the data. This exact expression is also
    // what the functional index in db/property_search_indexes.sql is built on, which is
    // what lets MySQL use the index despite the function call.
    conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
    values.push(filters.city);
  }
  if (filters.zipcode !== undefined) {
    // Some zips are stored as ZIP+4 ("94513-9999"); a prefix match catches both
    // and can still use the L_Zip index.
    conditions.push("L_Zip LIKE ?");
    values.push(`${filters.zipcode}%`);
  }
  if (filters.minPrice !== undefined) {
    conditions.push("L_SystemPrice >= ?");
    values.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push("L_SystemPrice <= ?");
    values.push(filters.maxPrice);
  }
  if (filters.beds !== undefined) {
    // "beds=3" means 3 or more, like the "3+" filter on Zillow/Redfin
    conditions.push("L_Keyword2 >= ?");
    values.push(filters.beds);
  }
  if (filters.baths !== undefined) {
    conditions.push("LM_Dec_3 >= ?");
    values.push(filters.baths);
  }

  const sql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { sql, values };
}

// L_Photos is stored as a JSON array in a text column
function parsePhotos(raw) {
  if (!raw) return [];
  try {
    const photos = JSON.parse(raw);
    return Array.isArray(photos) ? photos : [];
  } catch {
    return [];
  }
}

async function searchProperties({ filters, limit, offset }) {
  const where = buildWhereClause(filters);

  // Ordering by the primary key keeps pages stable: without ORDER BY, MySQL
  // may return rows in a different order per query and pages could overlap.
  const [[rows], [[{ total }]]] = await Promise.all([
    pool.query(
      `SELECT ${LIST_COLUMNS} FROM rets_property ${where.sql} ORDER BY id LIMIT ? OFFSET ?`,
      [...where.values, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM rets_property ${where.sql}`, where.values),
  ]);

  const results = rows.map((row) => ({ ...row, L_Photos: parsePhotos(row.L_Photos) }));
  return { total, limit, offset, results };
}

module.exports = { buildWhereClause, searchProperties };
