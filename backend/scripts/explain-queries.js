// Runs EXPLAIN on representative search queries and times them, so index
// changes can be compared before/after. Usage: npm run explain
// Results and what each EXPLAIN column means: db/PERFORMANCE.md
require("dotenv").config({ quiet: true });
const pool = require("../src/db");
const { buildWhereClause, buildOrderBy, buildPageQuery } = require("../src/queries/propertySearch");
const { CALENDAR_SQL } = require("../src/queries/openHouseCalendar");

// Each case runs the same two statements GET /api/properties runs: the COUNT
// for the total, and the page of rows (the deferred-join SELECT, LIMIT 20).
const CASES = [
  { name: "city", filters: { city: "Irvine" } },
  { name: "city + minPrice", filters: { city: "Irvine", minPrice: 300000 } },
  { name: "city + minPrice + beds", filters: { city: "Irvine", minPrice: 300000, beds: 3 } },
  { name: "zipcode", filters: { zipcode: "92618" } },
  { name: "price range", filters: { minPrice: 5000000, maxPrice: 6000000 } },
  { name: "beds + baths", filters: { beds: 8, baths: 6 } },
  { name: "beds, sort price asc", filters: { beds: 3 }, sort: { column: "L_SystemPrice", order: "asc" } },
  { name: "price range, sort sqft asc", filters: { minPrice: 500000, maxPrice: 900000 }, sort: { column: "LM_Int2_3", order: "asc" } },
  {
    name: "city + price, sort price desc",
    filters: { city: "Irvine", minPrice: 300000, maxPrice: 2000000 },
    sort: { column: "L_SystemPrice", order: "desc" },
  },
  { name: "no filter, sort date desc", filters: {}, sort: { column: "ListingContractDate", order: "desc" } },
];

const RUNS = 7;
const PAGE_SIZE = 20;

async function medianMs(sql, values) {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = process.hrtime.bigint();
    await pool.query(sql, values);
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  times.sort((a, b) => a - b);
  return Number(times[Math.floor(RUNS / 2)].toFixed(2));
}

// FORMAT=TRADITIONAL gives the classic table (type, key, rows, Extra); newer
// MySQL versions default to a TREE format instead. A join has one plan row per
// table, so the rows are joined with " | ".
async function explain(sql, values) {
  const [plan] = await pool.query(`EXPLAIN FORMAT=TRADITIONAL ${sql}`, values);
  const pick = (col) => plan.map((row) => row[col] ?? "-").join(" | ");
  return {
    type: pick("type"),
    key: pick("key"),
    // An estimate from index statistics, not a count of rows actually read
    estRows: pick("rows"),
    extra: pick("Extra"),
  };
}

async function main() {
  const count = [];
  const page = [];
  for (const { name, filters, sort } of CASES) {
    const where = buildWhereClause(filters);
    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${where.sql}`;
    count.push({ query: name, ...(await explain(countSql, where.values)), medianMs: await medianMs(countSql, where.values) });

    const pageSql = buildPageQuery(where.sql, buildOrderBy(sort));
    const pageValues = [...where.values, PAGE_SIZE, 0];
    page.push({ query: name, ...(await explain(pageSql, pageValues)), medianMs: await medianMs(pageSql, pageValues) });
  }

  const calendarValues = ["2026-08-30", "2026-10-10"];
  const calendar = [{ query: "open houses Aug 30 - Oct 10", ...(await explain(CALENDAR_SQL, calendarValues)), medianMs: await medianMs(CALENDAR_SQL, calendarValues) }];

  console.log("COUNT(*) queries (total for pagination)");
  console.table(count);
  console.log(`Page queries (deferred join, LIMIT ${PAGE_SIZE}; one plan row per table)`);
  console.table(page);
  console.log("GET /api/openhouses");
  console.table(calendar);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
