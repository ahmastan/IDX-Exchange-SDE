import { describe, expect, it } from "vitest";
import {
  formatOpenHouseDate,
  formatTime,
  formatTimeRange,
  getOpenHouseRemarks,
  isPastOpenHouse,
} from "./openHouses";

describe("formatOpenHouseDate", () => {
  it("formats the calendar date without shifting it a day for time zones", () => {
    // new Date("2026-09-20") would be Sep 19 in California
    expect(formatOpenHouseDate("2026-09-20")).toBe("Sun, Sep 20, 2026");
  });

  it("returns null for missing or invalid dates", () => {
    expect(formatOpenHouseDate(null)).toBeNull();
    expect(formatOpenHouseDate("")).toBeNull();
    expect(formatOpenHouseDate("not a date")).toBeNull();
    expect(formatOpenHouseDate("2026-02-31")).toBeNull();
  });
});

describe("formatTime / formatTimeRange", () => {
  it("converts 24-hour database times to 12-hour times", () => {
    expect(formatTime("13:00:00")).toBe("1:00 PM");
    expect(formatTime("00:30:00")).toBe("12:30 AM");
    expect(formatTime("12:15")).toBe("12:15 PM");
    expect(formatTime("09:05:00")).toBe("9:05 AM");
  });

  it("returns null for invalid times", () => {
    expect(formatTime("25:00:00")).toBeNull();
    expect(formatTime(null)).toBeNull();
  });

  it("joins start and end, or falls back to whichever exists", () => {
    expect(formatTimeRange("13:00:00", "16:00:00")).toBe("1:00 PM – 4:00 PM");
    expect(formatTimeRange("13:00:00", null)).toBe("1:00 PM");
    expect(formatTimeRange(null, null)).toBeNull();
  });
});

describe("getOpenHouseRemarks", () => {
  it("reads OpenHouseRemarks out of the all_data JSON string", () => {
    const allData = JSON.stringify({ OpenHouseType: "Public", OpenHouseRemarks: "  Snacks provided!  " });
    expect(getOpenHouseRemarks(allData)).toBe("Snacks provided!");
  });

  it("accepts all_data that is already an object", () => {
    expect(getOpenHouseRemarks({ OpenHouseRemarks: "Bring ID" })).toBe("Bring ID");
  });

  it("returns null for null, blank, missing, or unreadable remarks", () => {
    expect(getOpenHouseRemarks(JSON.stringify({ OpenHouseRemarks: null }))).toBeNull();
    expect(getOpenHouseRemarks(JSON.stringify({ OpenHouseRemarks: "   " }))).toBeNull();
    expect(getOpenHouseRemarks(JSON.stringify({}))).toBeNull();
    expect(getOpenHouseRemarks("{not json")).toBeNull();
    expect(getOpenHouseRemarks(null)).toBeNull();
    expect(getOpenHouseRemarks("null")).toBeNull();
  });
});

describe("isPastOpenHouse", () => {
  it("compares the date with today", () => {
    expect(isPastOpenHouse("2026-09-20", "2026-11-13")).toBe(true);
    expect(isPastOpenHouse("2026-11-13", "2026-11-13")).toBe(false);
    expect(isPastOpenHouse("2026-12-01", "2026-11-13")).toBe(false);
    expect(isPastOpenHouse(null, "2026-11-13")).toBe(false);
  });
});
