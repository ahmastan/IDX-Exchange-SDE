const pool = require("../db");
const { SORTABLE_COLUMNS } = require("../validation/propertyQuery");

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
  "ListingContractDate",
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

// Builds the ORDER BY clause. The column name can't be sent as a "?" value:
// mysql2 would quote it as a string ('L_SystemPrice'), and ordering by a
// constant string leaves the rows unsorted without any error. Instead the
// name is checked against the whitelist again here (the validator already
// did, but this is the line that writes it into SQL) and inserted directly.
//
// id is the tie-breaker, in the same direction as the sort column, so rows
// with the same price/date/etc. keep one fixed order and pages never overlap.
// Without a sort, ordering by the primary key keeps pages stable: without any
// ORDER BY, MySQL may return rows in a different order per query.
function buildOrderBy(sort) {
  if (!sort) return "ORDER BY id";
  if (!SORTABLE_COLUMNS.includes(sort.column)) throw new Error(`Unsortable column: ${sort.column}`);
  const direction = sort.order === "desc" ? "DESC" : "ASC";
  // MySQL puts NULLs first in ascending order. "col IS NULL" is 0 for real
  // values and 1 for NULLs, so listings with no sqft/beds go last either way
  // instead of filling the first page with blanks.
  return `ORDER BY ${sort.column} IS NULL, ${sort.column} ${direction}, id ${direction}`;
}

// The query for one page of results, written as a "deferred join". rets_property
// rows are very wide, so sorting whole rows is slow: an unfiltered sort by date
// took about 1.3 s, because MySQL read and sorted all 55k full rows to keep 20.
// The subquery finds and sorts only the ids, which MySQL can usually do from
// a small index without touching the table. The outer query then fetches the
// full columns for just those 20 ids. The outer ORDER BY is still needed,
// because a join doesn't preserve the subquery's order. Measurements are in
// db/PERFORMANCE.md.
function buildPageQuery(whereSql, orderBy) {
  return `SELECT ${LIST_COLUMNS} FROM rets_property
    JOIN (SELECT id FROM rets_property ${whereSql} ${orderBy} LIMIT ? OFFSET ?) AS page USING (id)
    ${orderBy}`;
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

async function searchProperties({ filters, limit, offset, sort }) {
  const where = buildWhereClause(filters);
  const orderBy = buildOrderBy(sort);

  const [[rows], [[{ total }]]] = await Promise.all([
    pool.query(buildPageQuery(where.sql, orderBy), [...where.values, limit, offset]),
    pool.query(`SELECT COUNT(*) AS total FROM rets_property ${where.sql}`, where.values),
  ]);

  const results = rows.map((row) => ({ ...row, L_Photos: parsePhotos(row.L_Photos) }));
  return { total, limit, offset, results };
}

module.exports = { buildWhereClause, buildOrderBy, buildPageQuery, parsePhotos, searchProperties, LIST_COLUMNS };
