// GET /api/openhouses (Week 9 open house calendar). Validation is tested
// directly; the API tests run against the real MySQL database.
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");
const { parseDateRange, MAX_RANGE_DAYS } = require("../src/validation/dateRange");

afterAll(() => pool.end());

describe("parseDateRange", () => {
  test("accepts a valid range, including a single day", () => {
    expect(parseDateRange({ startDate: "2026-09-01", endDate: "2026-09-30" }).value).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(parseDateRange({ startDate: "2026-09-20", endDate: "2026-09-20" }).value).toBeDefined();
  });

  test.each([
    ["a missing endDate", { startDate: "2026-09-01" }],
    ["blank dates", { startDate: "", endDate: " " }],
    ["a non-date", { startDate: "next tuesday", endDate: "2026-09-30" }],
    ["an impossible date", { startDate: "2026-02-31", endDate: "2026-03-05" }],
    ["start after end", { startDate: "2026-09-30", endDate: "2026-09-01" }],
    ["a repeated param", { startDate: ["2026-09-01", "2026-09-02"], endDate: "2026-09-30" }],
  ])("rejects %s", (_, query) => {
    expect(parseDateRange(query).errors.length).toBeGreaterThan(0);
  });

  test(`allows exactly ${MAX_RANGE_DAYS} days but not one more`, () => {
    // 2028 is a leap year: Jan 1 - Dec 31 is 366 days
    expect(MAX_RANGE_DAYS).toBe(366);
    expect(parseDateRange({ startDate: "2028-01-01", endDate: "2028-12-31" }).value).toBeDefined();
    expect(parseDateRange({ startDate: "2028-01-01", endDate: "2029-01-01" }).errors).toBeDefined();
  });

  test("accepts a range spanning several months", () => {
    expect(parseDateRange({ startDate: "2026-09-01", endDate: "2026-11-30" }).value).toBeDefined();
  });
});

describe("GET /api/openhouses", () => {
  test("returns open houses in the range with property details", async () => {
    const res = await request(app).get("/api/openhouses?startDate=2026-09-26&endDate=2026-09-27").expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const oh of res.body) {
      expect(oh.OpenHouseDate >= "2026-09-26" && oh.OpenHouseDate <= "2026-09-27").toBe(true);
      expect(oh).toHaveProperty("L_ListingID");
      expect(oh).toHaveProperty("L_Address");
      // all_data itself is too big to send; its fields are extracted instead
      expect(oh).not.toHaveProperty("all_data");
    }
  });

  test("is sorted by date, then start time", async () => {
    const res = await request(app).get("/api/openhouses?startDate=2026-09-26&endDate=2026-09-30").expect(200);
    const keys = res.body.map((oh) => `${oh.OpenHouseDate} ${oh.OH_StartTime}`);
    expect(keys).toEqual([...keys].sort());
  });

  test("matches a hand-written count of open houses whose property exists", async () => {
    const [[{ n }]] = await pool.query(
      `SELECT COUNT(*) AS n FROM rets_openhouse o
       WHERE o.OpenHouseDate BETWEEN '2026-09-21' AND '2026-09-27'
         AND EXISTS (SELECT 1 FROM rets_property p WHERE p.L_ListingID = o.L_ListingID)`
    );
    const res = await request(app).get("/api/openhouses?startDate=2026-09-21&endDate=2026-09-27").expect(200);
    // Equal, not greater: a listing stored on two property rows mustn't
    // make its open houses appear twice
    expect(res.body).toHaveLength(n);
  });

  test("extracts OpenHouseRemarks and OpenHouseType from all_data, with real nulls", async () => {
    const res = await request(app).get("/api/openhouses?startDate=2026-09-18&endDate=2026-09-20").expect(200);
    const withRemarks = res.body.filter((oh) => oh.OpenHouseRemarks !== null);
    expect(withRemarks.length).toBeGreaterThan(0);
    expect(res.body.some((oh) => oh.OpenHouseRemarks === null)).toBe(true);
    // JSON null must come back as null, never as the string "null"
    expect(res.body.some((oh) => oh.OpenHouseRemarks === "null")).toBe(false);
    expect(res.body.every((oh) => typeof oh.OpenHouseType === "string")).toBe(true);
  });

  test("an empty date range returns [] rather than an error", async () => {
    const res = await request(app).get("/api/openhouses?startDate=2020-01-01&endDate=2020-01-31").expect(200);
    expect(res.body).toEqual([]);
  });

  test("bad dates are a 400 with a message", async () => {
    const res = await request(app).get("/api/openhouses?startDate=2026-09-30&endDate=2026-09-01").expect(400);
    expect(res.body.error).toMatch(/startDate cannot be after endDate/);
    await request(app).get("/api/openhouses").expect(400);
  });
});
