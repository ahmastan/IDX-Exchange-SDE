import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchProperties, fetchPropertyDetail } from "./client";

// fetch() is mocked so these tests never touch the network or need the
// backend running. Each test decides exactly what the "server" sends back.
let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// The URL the client passed to fetch() on its first call
function requestedUrl() {
  return fetchMock.mock.calls[0][0];
}

describe("fetchProperties", () => {
  it("resolves to the parsed JSON body on success", async () => {
    const body = { total: 1, limit: 20, offset: 0, results: [{ L_ListingID: 42 }] };
    fetchMock.mockResolvedValue(jsonResponse(body));

    await expect(fetchProperties({ limit: 20 })).resolves.toEqual(body);
  });

  it("puts every filter in the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 0, results: [] }));

    await fetchProperties({
      city: "Irvine",
      zipcode: "92614",
      minPrice: 500000,
      maxPrice: 900000,
      beds: 3,
      baths: 2.5,
    });

    const params = new URL(requestedUrl(), "http://localhost").searchParams;
    expect(new URL(requestedUrl(), "http://localhost").pathname).toBe("/api/properties");
    expect(Object.fromEntries(params)).toEqual({
      city: "Irvine",
      zipcode: "92614",
      minPrice: "500000",
      maxPrice: "900000",
      beds: "3",
      baths: "2.5",
    });
  });

  it("leaves out empty, blank, null, and undefined params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 0, results: [] }));

    await fetchProperties({ city: "  ", zipcode: "", minPrice: null, beds: undefined, baths: "2" });

    expect(requestedUrl()).toBe("/api/properties?baths=2");
  });

  it("sends no query string at all when there are no params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 0, results: [] }));

    await fetchProperties({});

    expect(requestedUrl()).toBe("/api/properties");
  });

  it("throws an ApiError with the backend's message on a 400", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "zipcode must be exactly 5 digits" }, 400));

    const error = await fetchProperties({ zipcode: "123" }).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("zipcode must be exactly 5 digits");
    expect(error.status).toBe(400);
  });

  it("throws a 'could not reach the server' error when the network request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchProperties()).rejects.toThrow(/could not reach the property server/i);
  });

  it("treats an empty 500 from the dev proxy as the backend being down", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    await expect(fetchProperties()).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: expect.stringMatching(/could not reach the property server/i),
    });
  });

  it("rethrows AbortError untouched so callers can ignore cancelled requests", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

    await expect(fetchProperties()).rejects.toMatchObject({ name: "AbortError" });
  });

  it("passes the abort signal through to fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total: 0, results: [] }));
    const controller = new AbortController();

    await fetchProperties({}, { signal: controller.signal });

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

describe("fetchPropertyDetail", () => {
  it("requests the property by ID and URL-encodes it", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ L_ListingID: 1 }));

    await fetchPropertyDetail("12/34");

    expect(requestedUrl()).toBe("/api/properties/12%2F34");
  });

  it("throws the backend's 404 message for an unknown property", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Property not found" }, 404));

    await expect(fetchPropertyDetail("999")).rejects.toMatchObject({
      status: 404,
      message: "Property not found",
    });
  });
});
