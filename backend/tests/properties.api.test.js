// Runs against the real MySQL database, so Docker must be running.
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");

afterAll(() => pool.end());

// Counts rows with a hand-written query, independent of buildWhereClause,
// so the API's total can be checked against a known-correct answer.
async function countWhere(sql, values) {
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM rets_property WHERE ${sql}`, values);
  return n;
}

describe("GET /api/properties", () => {
  test("returns 20 properties by default with a total count", async () => {
    const res = await request(app).get("/api/properties").expect(200);
    expect(res.body).toMatchObject({ limit: 20, offset: 0 });
    expect(res.body.results).toHaveLength(20);
    expect(res.body.total).toBeGreaterThan(20);
  });

  test("?limit=10&offset=20 returns properties 21-30", async () => {
    const all = await request(app).get("/api/properties?limit=30").expect(200);
    const page = await request(app).get("/api/properties?limit=10&offset=20").expect(200);
    const ids = (r) => r.body.results.map((p) => p.L_ListingID);
    expect(ids(page)).toEqual(ids(all).slice(20, 30));
  });

  test("?city=Irvine returns only Irvine properties, ignoring case and spaces", async () => {
    const res = await request(app).get("/api/properties?city=%20irVINE%20&limit=100").expect(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    for (const p of res.body.results) expect(p.L_City.trim().toLowerCase()).toBe("irvine");
    expect(res.body.total).toBe(await countWhere("LOWER(TRIM(L_City)) = 'irvine'", []));
  });

  // Debug challenge: the total must be right when minPrice and beds are combined
  test("minPrice + beds combined returns the correct total", async () => {
    const res = await request(app).get("/api/properties?minPrice=300000&beds=3").expect(200);
    const expected = await countWhere("L_SystemPrice >= ? AND L_Keyword2 >= ?", [300000, 3]);
    expect(res.body.total).toBe(expected);
    for (const p of res.body.results) {
      expect(p.L_SystemPrice).toBeGreaterThanOrEqual(300000);
      expect(p.L_Keyword2).toBeGreaterThanOrEqual(3);
    }
  });

  test("city + minPrice + beds combine", async () => {
    const res = await request(app)
      .get("/api/properties?city=Irvine&minPrice=300000&beds=3")
      .expect(200);
    const expected = await countWhere(
      "LOWER(TRIM(L_City)) = 'irvine' AND L_SystemPrice >= ? AND L_Keyword2 >= ?",
      [300000, 3]
    );
    expect(res.body.total).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  test("zipcode, maxPrice and baths filters apply", async () => {
    const res = await request(app)
      .get("/api/properties?zipcode=92618&maxPrice=2000000&baths=2.5")
      .expect(200);
    for (const p of res.body.results) {
      expect(p.L_Zip.startsWith("92618")).toBe(true);
      expect(p.L_SystemPrice).toBeLessThanOrEqual(2000000);
      expect(p.LM_Dec_3).toBeGreaterThanOrEqual(2.5);
    }
  });

  test("L_Photos is returned as an array", async () => {
    const res = await request(app).get("/api/properties?limit=5").expect(200);
    for (const p of res.body.results) expect(Array.isArray(p.L_Photos)).toBe(true);
  });

  test.each(["minPrice=abc", "limit=0", "limit=200"])(
    "?%s returns 400 with a descriptive message",
    async (qs) => {
      const res = await request(app).get(`/api/properties?${qs}`).expect(400);
      expect(res.body.error).toMatch(/must be/);
    }
  );

  test("a quote in city is treated as data, not SQL", async () => {
    const res = await request(app)
      .get("/api/properties?city=" + encodeURIComponent("Irvine' OR '1'='1"))
      .expect(200);
    expect(res.body.total).toBe(0);
  });
});
