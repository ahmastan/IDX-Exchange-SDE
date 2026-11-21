const pool = require("../db");

// Every open house between two dates (inclusive), with enough property info
// to label a calendar event. Soonest first; id breaks ties.
//
// Notes on the data:
// - all_data is a JSON blob of about 1.5 KB per row, and September 2026 alone
//   has over 13,000 open houses. Sending the whole blob would be roughly 19 MB,
//   so only the two fields the calendar shows are pulled out of it here.
//   JSON_VALID guards against a malformed blob (JSON_EXTRACT would error and
//   fail the whole request), and the JSON_TYPE check matters because
//   ->> turns a JSON null into the four-letter string "null".
// - Some listing IDs appear on several rets_property rows. Joining on the
//   newest row per ID (MAX(id), the same row the detail page shows) keeps
//   each open house from appearing once per copy.
// - About 1,300 open houses belong to listings that aren't in rets_property.
//   The inner join leaves them out, because clicking one would open a
//   "property not found" page.
const CALENDAR_SQL = `
  SELECT
    o.id,
    o.L_ListingID,
    o.OpenHouseDate,
    o.OH_StartTime,
    o.OH_EndTime,
    CASE WHEN JSON_VALID(o.all_data) AND JSON_TYPE(o.all_data->'$.OpenHouseType') = 'STRING'
      THEN o.all_data->>'$.OpenHouseType' END AS OpenHouseType,
    CASE WHEN JSON_VALID(o.all_data) AND JSON_TYPE(o.all_data->'$.OpenHouseRemarks') = 'STRING'
      THEN NULLIF(TRIM(o.all_data->>'$.OpenHouseRemarks'), '') END AS OpenHouseRemarks,
    p.L_Address,
    p.L_City,
    p.L_Zip,
    p.L_SystemPrice
  FROM rets_openhouse o
  JOIN rets_property p
    ON p.id = (SELECT MAX(p2.id) FROM rets_property p2 WHERE p2.L_ListingID = o.L_ListingID)
  WHERE o.OpenHouseDate BETWEEN ? AND ?
  ORDER BY o.OpenHouseDate, o.OH_StartTime, o.id`;

async function getOpenHousesInRange({ startDate, endDate }) {
  const [rows] = await pool.query(CALENDAR_SQL, [startDate, endDate]);
  return rows;
}

module.exports = { getOpenHousesInRange, CALENDAR_SQL };
