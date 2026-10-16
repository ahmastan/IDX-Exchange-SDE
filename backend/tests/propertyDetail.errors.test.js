// The database is mocked here so failures can be forced on demand.
jest.mock("../src/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => console.error.mockRestore());

describe("database failures return 500 instead of crashing", () => {
  test("GET /api/properties/:id", async () => {
    pool.query.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const res = await request(app).get("/api/properties/123456789").expect(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  test("GET /api/properties/:id/openhouses when the open house query fails", async () => {
    pool.query
      .mockResolvedValueOnce([[{ 1: 1 }]]) // property exists
      .mockRejectedValueOnce(new Error("Lost connection"));
    await request(app).get("/api/properties/123456789/openhouses").expect(500);
  });
});

test("the listing ID is passed to MySQL as a string so the index is used", async () => {
  pool.query.mockResolvedValue([[]]);
  await request(app).get("/api/properties/123456789").expect(404);
  expect(pool.query.mock.calls[0][1]).toEqual(["123456789"]);
});

// Route order: the specific /:id/openhouses route must win over /:id
test("/:id/openhouses runs the open house query, not the detail query", async () => {
  pool.query.mockResolvedValueOnce([[{ 1: 1 }]]).mockResolvedValueOnce([[]]);
  const res = await request(app).get("/api/properties/123456789/openhouses").expect(200);
  expect(res.body).toEqual([]);
  expect(pool.query.mock.calls[1][0]).toContain("FROM rets_openhouse");
});
