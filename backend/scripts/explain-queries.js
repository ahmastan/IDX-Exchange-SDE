// Runs EXPLAIN on representative search queries and times them, so index
// changes can be compared before/after. Usage: npm run explain
require("dotenv").config({ quiet: true });
const pool = require("../src/db");
const { buildWhereClause } = require("../src/queries/propertySearch");

const CASES = [
  { name: "city", filters: { city: "Irvine" } },
  { name: "city + minPrice", filters: { city: "Irvine", minPrice: 300000 } },
  { name: "city + minPrice + beds", filters: { city: "Irvine", minPrice: 300000, beds: 3 } },
  { name: "zipcode", filters: { zipcode: "92618" } },
  { name: "price range", filters: { minPrice: 5000000, maxPrice: 6000000 } },
  { name: "beds + baths", filters: { beds: 8, baths: 6 } },
];

const RUNS = 7;

async function medianMs(sql, values) {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = process.hrtime.bigint();
    await pool.query(sql, values);
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(RUNS / 2)];
}

async function main() {
  const report = [];
  for (const { name, filters } of CASES) {
    const where = buildWhereClause(filters);
    const sql = `SELECT COUNT(*) AS total FROM rets_property ${where.sql}`;
    // FORMAT=TRADITIONAL gives the classic table (type, key, rows); newer MySQL
    // versions default to a TREE format instead
    const [[plan]] = await pool.query(`EXPLAIN FORMAT=TRADITIONAL ${sql}`, where.values);
    report.push({
      query: name,
      type: plan.type,
      key: plan.key,
      rowsExamined: plan.rows,
      medianMs: Number((await medianMs(sql, where.values)).toFixed(2)),
    });
  }
  console.table(report);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
