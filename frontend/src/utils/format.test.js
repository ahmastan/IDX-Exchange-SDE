import { describe, expect, it } from "vitest";
import { formatEnumList, formatYesNo } from "./format";

describe("formatEnumList", () => {
  it("splits PascalCase RETS values into words", () => {
    expect(formatEnumList("SingleFamilyResidence")).toBe("Single Family Residence");
    expect(formatEnumList("MainLevelPrimary,PrimarySuite")).toBe("Main Level Primary, Primary Suite");
  });

  it("keeps acronyms together", () => {
    expect(formatEnumList("HOAFee")).toBe("HOA Fee");
  });

  it("returns null for blank, None, and non-string values", () => {
    expect(formatEnumList("")).toBeNull();
    expect(formatEnumList("None")).toBeNull();
    expect(formatEnumList(null)).toBeNull();
  });
});

describe("formatYesNo", () => {
  it("maps the different flag encodings", () => {
    expect(formatYesNo(1)).toBe("Yes");
    expect(formatYesNo("1")).toBe("Yes");
    expect(formatYesNo(0)).toBe("No");
    expect(formatYesNo("")).toBeNull();
    expect(formatYesNo(null)).toBeNull();
  });
});
