import { describe, expect, it } from "vitest";
import { formatMonth, groupByDate, monthGrid, parseMonth, shiftMonth, todayIso } from "./calendar";

describe("parseMonth", () => {
  it("reads YYYY-MM", () => {
    expect(parseMonth("2026-09")).toEqual({ year: 2026, month: 9 });
  });

  it.each([null, "", "2026-13", "2026-00", "2026-9", "September", "2026-09-01"])("rejects %j", (value) => {
    expect(parseMonth(value)).toBeNull();
  });
});

describe("shiftMonth", () => {
  it("wraps across years in both directions", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("monthGrid", () => {
  it("is six weeks starting on the Sunday on or before the 1st", () => {
    // Sep 1, 2026 is a Tuesday
    const days = monthGrid({ year: 2026, month: 9 });
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({ date: "2026-08-30", day: 30, inMonth: false });
    expect(days[2]).toEqual({ date: "2026-09-01", day: 1, inMonth: true });
    expect(days[41].date).toBe("2026-10-10");
    expect(days.filter((d) => d.inMonth)).toHaveLength(30);
  });

  it("starts on the 1st itself when the month begins on a Sunday", () => {
    // Nov 1, 2026 is a Sunday
    expect(monthGrid({ year: 2026, month: 11 })[0].date).toBe("2026-11-01");
  });

  it("handles leap-year February and daylight-saving changes without skipping a day", () => {
    const feb = monthGrid({ year: 2028, month: 2 }).filter((d) => d.inMonth);
    expect(feb).toHaveLength(29);
    // Clocks change on Nov 1 and Mar 8 in 2026; every date must still appear once
    const dates = monthGrid({ year: 2026, month: 3 }).map((d) => d.date);
    expect(new Set(dates).size).toBe(42);
    expect(dates).toContain("2026-03-08");
  });
});

describe("formatting", () => {
  it("formatMonth", () => {
    expect(formatMonth({ year: 2026, month: 9 })).toBe("September 2026");
  });

  it("todayIso uses the local date", () => {
    expect(todayIso(new Date(2026, 8, 5, 23, 30))).toBe("2026-09-05");
  });
});

describe("groupByDate", () => {
  it("groups by OpenHouseDate and keeps the API's order", () => {
    const a = { id: 1, OpenHouseDate: "2026-09-19" };
    const b = { id: 2, OpenHouseDate: "2026-09-20" };
    const c = { id: 3, OpenHouseDate: "2026-09-19" };
    const byDate = groupByDate([a, b, c]);
    expect(byDate.get("2026-09-19")).toEqual([a, c]);
    expect(byDate.get("2026-09-20")).toEqual([b]);
    expect(byDate.get("2026-09-21")).toBeUndefined();
  });
});
