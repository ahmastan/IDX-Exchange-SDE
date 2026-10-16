// Runs against the real MySQL database, so Docker must be running.
// Test IDs are looked up rather than hardcoded so the tests keep working when
// the tables are refreshed with new data.
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");

afterAll(() => pool.end());

async function firstId(sql) {
  const [[row]] = await pool.query(sql);
  return row.id;
}

const withOpenHouses = () =>
  firstId(
    `SELECT p.L_ListingID AS id FROM rets_property p
     WHERE EXISTS (SELECT 1 FROM rets_openhouse o WHERE o.L_ListingID = p.L_ListingID)
     LIMIT 1`
  );

const withoutOpenHouses = () =>
  firstId(
    `SELECT p.L_ListingID AS id FROM rets_property p
     WHERE NOT EXISTS (SELECT 1 FROM rets_openhouse o WHERE o.L_ListingID = p.L_ListingID)
     LIMIT 1`
  );

// Open houses whose listing is missing from rets_property. The data has
// over a thousand of these; code that assumes the property row exists
// throws on them.
const orphanOpenHouse = () =>
  firstId(
    `SELECT o.L_ListingID AS id FROM rets_openhouse o
     WHERE NOT EXISTS (SELECT 1 FROM rets_property p WHERE p.L_ListingID = o.L_ListingID)
     LIMIT 1`
  );

const UNKNOWN_ID = "999999999";

describe("GET /api/properties/:id", () => {
  test("returns the full property object", async () => {
    const id = await withOpenHouses();
    const res = await request(app).get(`/api/properties/${id}`).expect(200);
    expect(res.body.L_ListingID).toBe(id);
    // Every column, not just the ones the search results use
    expect(res.body).toHaveProperty("L_Remarks");
    expect(res.body).toHaveProperty("YearBuilt");
    expect(Array.isArray(res.body.L_Photos)).toBe(true);
  });

  test("returns 404 with a helpful message for an unknown ID", async () => {
    const res = await request(app).get(`/api/properties/${UNKNOWN_ID}`).expect(404);
    expect(res.body.error).toContain(UNKNOWN_ID);
  });

  test.each(["abc123", "12.5", "-1", "1".repeat(21), "1%27%20OR%20%271%27%3D%271"])(
    "returns 400 for malformed or oversized ID %s",
    async (id) => {
      const res = await request(app).get(`/api/properties/${id}`).expect(400);
      expect(res.body.error).toMatch(/Listing ID/);
    }
  );
});

describe("GET /api/properties/:id/openhouses", () => {
  test("returns the property's open houses ordered by date and start time", async () => {
    const id = await withOpenHouses();
    const res = await request(app).get(`/api/properties/${id}/openhouses`).expect(200);
    expect(res.body.length).toBeGreaterThan(0);

    const keys = res.body.map((o) => `${o.OpenHouseDate} ${o.OH_StartTime}`);
    expect(keys).toEqual([...keys].sort());
    for (const o of res.body) {
      expect(o.L_ListingID).toBe(id);
      expect(o.OpenHouseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof o.all_data).toBe("string");
    }
  });

  test("returns an empty array for a property with no open houses", async () => {
    const id = await withoutOpenHouses();
    const res = await request(app).get(`/api/properties/${id}/openhouses`).expect(200);
    expect(res.body).toEqual([]);
  });

  test("returns 404 for an unknown property", async () => {
    await request(app).get(`/api/properties/${UNKNOWN_ID}/openhouses`).expect(404);
  });

  // Debug challenge: listings that have open houses but no property row
  test("returns 404, not a crash, for open houses whose property is missing", async () => {
    const id = await orphanOpenHouse();
    const res = await request(app).get(`/api/properties/${id}/openhouses`).expect(404);
    expect(res.body.error).toContain(id);
  });

  test("returns 400 for a malformed ID", async () => {
    await request(app).get("/api/properties/abc123/openhouses").expect(400);
  });
});
