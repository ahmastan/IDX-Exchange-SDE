import { describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, toSnapshot, useFavorites } from "./useFavorites";

const HOUSE = {
  L_ListingID: "111",
  L_Address: "1 Elm St",
  L_City: "Irvine",
  L_SystemPrice: 900000,
  L_Photos: Array.from({ length: 30 }, (_, i) => `https://img.test/${i}.jpg`),
  L_Remarks: "Not needed on a card",
};
const CONDO = { L_ListingID: 222, L_Address: "2 Oak Ave", L_Photos: [] };

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY));

describe("useFavorites", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("toggles a property on and off and writes it to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(HOUSE));
    expect(result.current.isFavorite("111")).toBe(true);
    expect(result.current.count).toBe(1);
    expect(stored().map((p) => p.L_ListingID)).toEqual(["111"]);

    act(() => result.current.toggleFavorite(HOUSE));
    expect(result.current.isFavorite("111")).toBe(false);
    expect(stored()).toEqual([]);
  });

  it("survives a reload: a fresh hook reads what an earlier one saved", () => {
    const first = renderHook(() => useFavorites());
    act(() => first.result.current.addFavorite(HOUSE));
    first.unmount();

    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite("111")).toBe(true);
  });

  it("keeps newest first, treats numeric and string IDs alike, and never duplicates", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(HOUSE);
      result.current.addFavorite(CONDO);
      result.current.addFavorite({ ...CONDO, L_ListingID: "222" });
    });
    expect(result.current.favorites.map((p) => p.L_ListingID)).toEqual(["222", "111"]);
    expect(result.current.isFavorite(222)).toBe(true);
  });

  it("stores only the card fields, with photos capped", () => {
    const snapshot = toSnapshot(HOUSE);
    expect(snapshot).not.toHaveProperty("L_Remarks");
    expect(snapshot.L_Photos).toHaveLength(10);
    expect(snapshot).toMatchObject({ L_ListingID: "111", L_Address: "1 Elm St", L_SystemPrice: 900000 });
  });

  it("every component using the hook sees the same favorites", async () => {
    function Heart() {
      const { toggleFavorite } = useFavorites();
      return <button onClick={() => toggleFavorite(HOUSE)}>heart</button>;
    }
    function Count() {
      return <p>count: {useFavorites().count}</p>;
    }
    render(
      <>
        <Heart />
        <Count />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "heart" }));
    expect(screen.getByText("count: 1")).toBeInTheDocument();
  });

  it("picks up changes made in another tab", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([toSnapshot(CONDO)]));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(result.current.isFavorite("222")).toBe(true);
  });

  it.each([
    ["not JSON", "{oops"],
    ["not an array", '{"L_ListingID":"1"}'],
  ])("ignores stored data that is %s", (_, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it("skips malformed entries but keeps good ones", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([null, 5, { foo: 1 }, toSnapshot(HOUSE)]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.map((p) => p.L_ListingID)).toEqual(["111"]);
  });

  // Last on purpose: once storage fails, the store stays in memory-only mode
  // for the rest of this file
  it("still works for the visit when localStorage is unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(HOUSE));
    expect(result.current.isFavorite("111")).toBe(true);
    setItem.mockRestore();
  });
});
