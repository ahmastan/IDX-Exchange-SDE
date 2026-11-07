import { describe, expect, it } from "vitest";
import { ELLIPSIS as E, getPageNumbers } from "./pagination";

describe("getPageNumbers", () => {
  it("lists every page when they all fit", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("uses one ellipsis near the start", () => {
    expect(getPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, E, 24]);
    expect(getPageNumbers(4, 24)).toEqual([1, 2, 3, 4, 5, E, 24]);
  });

  it("uses two ellipses in the middle", () => {
    expect(getPageNumbers(5, 24)).toEqual([1, E, 4, 5, 6, E, 24]);
    expect(getPageNumbers(20, 24)).toEqual([1, E, 19, 20, 21, E, 24]);
  });

  it("uses one ellipsis near the end", () => {
    expect(getPageNumbers(21, 24)).toEqual([1, E, 20, 21, 22, 23, 24]);
    expect(getPageNumbers(24, 24)).toEqual([1, E, 20, 21, 22, 23, 24]);
  });

  // Debug challenge: the guide's bug shows the last page twice on pages near
  // the end. Checking every position of every size catches it wherever it
  // appears, instead of only on the pages someone thought to try.
  it("never repeats a page number, whatever the page and page count", () => {
    for (let total = 1; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        const numbers = getPageNumbers(current, total).filter((item) => item !== E);
        const label = `page ${current} of ${total}: ${numbers.join(" ")}`;

        expect(new Set(numbers).size, label).toBe(numbers.length);
        expect(numbers, label).toEqual([...numbers].sort((a, b) => a - b));
        expect(numbers[0], label).toBe(1);
        expect(numbers.at(-1), label).toBe(total);
        expect(numbers, label).toContain(current);
      }
    }
  });

  it("only uses an ellipsis to hide at least two pages", () => {
    for (let total = 1; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        const items = getPageNumbers(current, total);
        items.forEach((item, i) => {
          if (item === E) {
            expect(items[i + 1] - items[i - 1], `page ${current} of ${total}`).toBeGreaterThan(2);
          }
        });
      }
    }
  });
});
