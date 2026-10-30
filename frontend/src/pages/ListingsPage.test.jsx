import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fetchProperties } from "../api/client";
import ListingsPage from "./ListingsPage";

// Replace the real API client with a mock so the page can be tested without
// a backend. Each test controls when and how every request resolves.
vi.mock("../api/client", () => ({ fetchProperties: vi.fn() }));

function listing(id, address) {
  return { L_ListingID: id, L_Address: address, L_City: "Irvine", L_State: "CA", L_Photos: "[]" };
}

function page(...results) {
  return { total: results.length, limit: 20, offset: 0, results };
}

// A promise the test resolves by hand, to control the order responses arrive in
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

let user;

beforeEach(() => {
  vi.mocked(fetchProperties).mockReset();
  user = userEvent.setup();
});

describe("ListingsPage", () => {
  it("loads all properties first, then fetches again with the submitted filters", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(page(listing(1, "1 All St")))
      .mockResolvedValueOnce(page(listing(2, "2 Filtered Ave")));
    render(<ListingsPage />);
    expect(await screen.findByText("1 All St")).toBeInTheDocument();

    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.selectOptions(screen.getByLabelText("Beds"), "3");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("2 Filtered Ave")).toBeInTheDocument();
    expect(fetchProperties).toHaveBeenLastCalledWith(
      { city: "Irvine", beds: "3", limit: 20, offset: 0 },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("shows a helpful message when no properties match the filters", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(page(listing(1, "1 All St")))
      .mockResolvedValueOnce(page());
    render(<ListingsPage />);
    await screen.findByText("1 All St");

    await user.type(screen.getByLabelText("City"), "Nowhere");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No properties found.")).toBeInTheDocument();
    expect(screen.getByText(/widen the price range/i)).toBeInTheDocument();
  });

  it("Clear Filters reloads all properties", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(page(listing(1, "1 All St")))
      .mockResolvedValueOnce(page(listing(2, "2 Filtered Ave")))
      .mockResolvedValueOnce(page(listing(1, "1 All St")));
    render(<ListingsPage />);
    await screen.findByText("1 All St");
    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("2 Filtered Ave");

    await user.click(screen.getByRole("button", { name: "Clear Filters" }));

    expect(await screen.findByText("1 All St")).toBeInTheDocument();
    expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 0 }, expect.anything());
  });

  // Debug challenge: search city A, Clear, search city B. If city A's response
  // arrives late it must not flash on screen, and neither may the Clear
  // response once city B's results are showing.
  it("never shows results from an earlier search that resolves late", async () => {
    const initial = deferred();
    const searchA = deferred();
    const clear = deferred();
    const searchB = deferred();
    vi.mocked(fetchProperties)
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(searchA.promise)
      .mockReturnValueOnce(clear.promise)
      .mockReturnValueOnce(searchB.promise);

    render(<ListingsPage />);
    await act(async () => initial.resolve(page(listing(1, "1 All St"))));

    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getByRole("button", { name: "Clear Filters" }));
    await user.type(screen.getByLabelText("City"), "Tustin");
    await user.click(screen.getByRole("button", { name: "Search" }));

    // The first search's response finally arrives, after two newer requests
    await act(async () => searchA.resolve(page(listing(2, "2 Irvine Rd"))));
    expect(screen.queryByText("2 Irvine Rd")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading properties");

    await act(async () => searchB.resolve(page(listing(3, "3 Tustin Way"))));
    expect(screen.getByText("3 Tustin Way")).toBeInTheDocument();

    // The Clear request resolving last must not replace the Tustin results
    await act(async () => clear.resolve(page(listing(1, "1 All St"))));
    expect(screen.getByText("3 Tustin Way")).toBeInTheDocument();
    expect(screen.queryByText("1 All St")).not.toBeInTheDocument();
    expect(screen.queryByText("2 Irvine Rd")).not.toBeInTheDocument();
  });

  it("shows the API error message if a filtered search fails", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(page(listing(1, "1 All St")))
      .mockRejectedValueOnce(new Error("Could not reach the property server."));
    render(<ListingsPage />);
    await screen.findByText("1 All St");

    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Could not reach the property server.")).toBeInTheDocument();
  });
});
