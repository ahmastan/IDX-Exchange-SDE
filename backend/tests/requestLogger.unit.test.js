const express = require("express");
const request = require("supertest");
const requestLogger = require("../src/middleware/requestLogger");
const { parseListingId } = require("../src/validation/listingId");

describe("requestLogger", () => {
  test("logs timestamp, method, URL, status code and duration in ms", async () => {
    const log = jest.fn();
    const app = express();
    app.use(requestLogger({ log }));
    app.get("/missing", (req, res) => res.status(404).end());

    await request(app).get("/missing?x=1").expect(404);
    // "close" can fire just after supertest resolves
    await new Promise((resolve) => setImmediate(resolve));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z GET \/missing\?x=1 404 \d+\.\dms$/
    );
  });
});

describe("parseListingId", () => {
  test("accepts a numeric ID and keeps it a string", () => {
    expect(parseListingId("1175978785")).toEqual({ value: "1175978785" });
  });

  test.each(["", "abc123", "12 3", "1.5", "1".repeat(21), undefined])("rejects %j", (raw) => {
    expect(parseListingId(raw).error).toMatch(/Listing ID/);
  });
});
