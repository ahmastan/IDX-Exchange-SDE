const { buildWhereClause } = require("../src/queries/propertySearch");
const { parsePropertyQuery } = require("../src/validation/propertyQuery");

describe("buildWhereClause", () => {
  test("no filters produces no WHERE clause", () => {
    expect(buildWhereClause({})).toEqual({ sql: "", values: [] });
  });

  // Debug challenge: each "?" must line up with its value. If a value is
  // pushed out of order or skipped, minPrice gets compared with the beds
  // value (or vice versa) and the count comes back wrong.
  test("minPrice + beds: values line up with their placeholders", () => {
    const { sql, values } = buildWhereClause({ minPrice: 300000, beds: 3 });
    expect(sql).toBe("WHERE L_SystemPrice >= ? AND L_Keyword2 >= ?");
    expect(values).toEqual([300000, 3]);
  });

  test("every filter adds exactly one placeholder and one value", () => {
    const { sql, values } = buildWhereClause({
      city: "Irvine",
      zipcode: "92618",
      minPrice: 1,
      maxPrice: 2,
      beds: 3,
      baths: 2.5,
    });
    expect(sql.match(/\?/g)).toHaveLength(values.length);
    expect(values).toEqual(["Irvine", "92618%", 1, 2, 3, 2.5]);
  });
});

describe("parsePropertyQuery", () => {
  test("defaults to limit 20, offset 0, no filters", () => {
    expect(parsePropertyQuery({})).toEqual({ value: { limit: 20, offset: 0, filters: {} } });
  });

  test("converts values to numbers", () => {
    const { value } = parsePropertyQuery({ minPrice: "300000", baths: "2.5", limit: "10" });
    expect(value.filters).toEqual({ minPrice: 300000, baths: 2.5 });
    expect(value.limit).toBe(10);
  });

  test("treats empty strings as not provided", () => {
    expect(parsePropertyQuery({ city: "  ", minPrice: "" }).value.filters).toEqual({});
  });

  test.each([
    [{ minPrice: "abc" }, "minPrice"],
    [{ minPrice: "-5" }, "minPrice"],
    [{ limit: "0" }, "limit"],
    [{ limit: "200" }, "limit"],
    [{ limit: "1.5" }, "limit"],
    [{ offset: "-1" }, "offset"],
    [{ beds: "three" }, "beds"],
    [{ baths: "2.5.1" }, "baths"],
    [{ zipcode: "9261" }, "zipcode"],
    [{ city: "x".repeat(51) }, "city"],
    [{ city: ["Irvine", "Tustin"] }, "city"],
    [{ minPrice: "500", maxPrice: "100" }, "minPrice"],
  ])("rejects %j", (query, param) => {
    const { errors } = parsePropertyQuery(query);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(param);
  });
});
