// Week 9 sorting. The unit tests need no database; the API tests run against
// the real MySQL database, so Docker must be running.
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");
const { parsePropertyQuery } = require("../src/validation/propertyQuery");
const { buildOrderBy } = require("../src/queries/propertySearch");

afterAll(() => pool.end());

describe("parsePropertyQuery: sortBy / sortOrder", () => {
  test("accepts a whitelisted column and defaults to ascending", () => {
    expect(parsePropertyQuery({ sortBy: "L_SystemPrice" }).value.sort).toEqual({
      column: "L_SystemPrice",
      order: "asc",
    });
  });

  test("accepts sortOrder in any case", () => {
    expect(parsePropertyQuery({ sortBy: "ListingContractDate", sortOrder: "DESC" }).value.sort).toEqual({
      column: "ListingContractDate",
      order: "desc",
    });
  });

  test.each([
    ["a RESO name", { sortBy: "ListPrice" }],
    ["an SQL injection attempt", { sortBy: "L_SystemPrice; DROP TABLE rets_property" }],
    ["a column that isn't sortable", { sortBy: "L_Remarks" }],
    ["a bad sortOrder", { sortBy: "L_SystemPrice", sortOrder: "sideways" }],
    ["sortOrder without sortBy", { sortOrder: "desc" }],
    ["sortBy given twice", { sortBy: ["L_SystemPrice", "LM_Int2_3"] }],
  ])("rejects %s", (_, query) => {
    expect(parsePropertyQuery(query).errors).toHaveLength(1);
  });

  test("no sort params means no sort", () => {
    expect(parsePropertyQuery({}).value.sort).toBeUndefined();
  });
});

describe("buildOrderBy", () => {
  test("defaults to the primary key", () => {
    expect(buildOrderBy(undefined)).toBe("ORDER BY id");
  });

  test("puts NULLs last and breaks ties by id in the same direction", () => {
    expect(buildOrderBy({ column: "LM_Int2_3", order: "desc" })).toBe(
      "ORDER BY LM_Int2_3 IS NULL, LM_Int2_3 DESC, id DESC"
    );
  });

  test("refuses a column that isn't whitelisted, even if validation was skipped", () => {
    expect(() => buildOrderBy({ column: "1; DROP TABLE x", order: "asc" })).toThrow();
  });
});

describe("GET /api/properties sorting", () => {
  const prices = (res) => res.body.results.map((p) => p.L_SystemPrice);

  test("price low to high", async () => {
    const res = await request(app).get("/api/properties?sortBy=L_SystemPrice&sortOrder=asc&limit=50").expect(200);
    expect(prices(res)).toEqual([...prices(res)].sort((a, b) => a - b));
    const [[{ min }]] = await pool.query("SELECT MIN(L_SystemPrice) AS min FROM rets_property");
    expect(prices(res)[0]).toBe(min);
  });

  test("price high to low", async () => {
    const res = await request(app).get("/api/properties?sortBy=L_SystemPrice&sortOrder=desc&limit=50").expect(200);
    expect(prices(res)).toEqual([...prices(res)].sort((a, b) => b - a));
    const [[{ max }]] = await pool.query("SELECT MAX(L_SystemPrice) AS max FROM rets_property");
    expect(prices(res)[0]).toBe(max);
  });

  test("date listed, newest first", async () => {
    const res = await request(app).get("/api/properties?sortBy=ListingContractDate&sortOrder=desc&limit=50").expect(200);
    const dates = res.body.results.map((p) => p.ListingContractDate);
    // dateStrings: true returns "YYYY-MM-DD", which sorts correctly as text
    expect(dates).toEqual([...dates].sort().reverse());
    const [[{ newest }]] = await pool.query("SELECT MAX(ListingContractDate) AS newest FROM rets_property");
    expect(dates[0]).toBe(newest);
  });

  test("sorting combines with filters", async () => {
    const res = await request(app)
      .get("/api/properties?city=Irvine&minPrice=500000&sortBy=L_SystemPrice&sortOrder=asc")
      .expect(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    for (const p of res.body.results) {
      expect(p.L_City.trim().toLowerCase()).toBe("irvine");
      expect(p.L_SystemPrice).toBeGreaterThanOrEqual(500000);
    }
    expect(prices(res)).toEqual([...prices(res)].sort((a, b) => a - b));
  });

  test("ascending sqft puts listings with no sqft last", async () => {
    const res = await request(app).get("/api/properties?sortBy=LM_Int2_3&limit=5").expect(200);
    for (const p of res.body.results) expect(p.LM_Int2_3).not.toBeNull();
  });

  // Many listings share a price, so without the id tie-breaker consecutive
  // pages could repeat or skip listings
  test("pages of a sorted result don't overlap", async () => {
    const url = "/api/properties?sortBy=L_Keyword2&sortOrder=desc";
    const all = await request(app).get(`${url}&limit=60`).expect(200);
    const pages = await Promise.all(
      [0, 20, 40].map((offset) => request(app).get(`${url}&limit=20&offset=${offset}`))
    );
    const ids = (r) => r.body.results.map((p) => p.L_ListingID);
    expect(pages.flatMap(ids)).toEqual(ids(all));
  });

  test("an invalid sortBy is a 400 that names the allowed columns", async () => {
    const res = await request(app).get("/api/properties?sortBy=ListPrice").expect(400);
    expect(res.body.error).toMatch(/L_SystemPrice/);
  });

  test("an invalid sortOrder is a 400", async () => {
    await request(app).get("/api/properties?sortBy=L_SystemPrice&sortOrder=up").expect(400);
  });
});
