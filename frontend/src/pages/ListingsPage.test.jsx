import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("pagination", () => {
    // One page of a larger result set, as the API would return it
    function pageOf(total, offset, ...results) {
      return { total, limit: 20, offset, results };
    }

    const pageButton = (n) => screen.getByRole("button", { name: `Page ${n}` });

    beforeEach(() => {
      // jsdom doesn't implement scrolling
      vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("shows the controls below the grid with a results summary", async () => {
      vi.mocked(fetchProperties).mockResolvedValueOnce(pageOf(1234, 0, listing(1, "1 All St")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");

      expect(screen.getByText("Showing 1-1 of 1,234 properties")).toBeInTheDocument();
      const grid = screen.getByRole("region", { name: "Property results" });
      const nav = screen.getByRole("navigation", { name: "Pagination" });
      expect(grid.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("hides the controls when everything fits on one page", async () => {
      vi.mocked(fetchProperties).mockResolvedValueOnce(pageOf(20, 0, listing(1, "1 All St")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");

      expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
    });

    it("fetches the right offset, updates the summary and scrolls to the top", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockResolvedValueOnce(pageOf(45, 40, listing(2, "2 Last Page Ln")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");

      await user.click(pageButton(3));

      expect(await screen.findByText("2 Last Page Ln")).toBeInTheDocument();
      expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 40 }, expect.anything());
      expect(screen.getByText("Showing 41-41 of 45 properties")).toBeInTheDocument();
      expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(0, 0);
      expect(pageButton(3)).toHaveAttribute("aria-current", "page");
    });

    it("keeps the active filters when changing pages", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockResolvedValueOnce(pageOf(45, 0, listing(2, "2 Irvine Rd")))
        .mockResolvedValueOnce(pageOf(45, 20, listing(3, "3 Irvine Rd")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");
      await user.type(screen.getByLabelText("City"), "Irvine");
      await user.click(screen.getByRole("button", { name: "Search" }));
      await screen.findByText("2 Irvine Rd");

      await user.click(screen.getByRole("button", { name: "Next" }));

      expect(await screen.findByText("3 Irvine Rd")).toBeInTheDocument();
      expect(fetchProperties).toHaveBeenLastCalledWith(
        { city: "Irvine", limit: 20, offset: 20 },
        expect.anything()
      );
    });

    it("goes back to page 1 when new filters are applied", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockResolvedValueOnce(pageOf(45, 40, listing(2, "2 Last Page Ln")))
        .mockResolvedValueOnce(pageOf(45, 0, listing(3, "3 Irvine Rd")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");
      await user.click(pageButton(3));
      await screen.findByText("2 Last Page Ln");

      await user.type(screen.getByLabelText("City"), "Irvine");
      await user.click(screen.getByRole("button", { name: "Search" }));

      await screen.findByText("3 Irvine Rd");
      expect(fetchProperties).toHaveBeenLastCalledWith(
        { city: "Irvine", limit: 20, offset: 0 },
        expect.anything()
      );
      expect(fetchProperties).toHaveBeenCalledTimes(3); // one request, not one per state change
      expect(pageButton(1)).toHaveAttribute("aria-current", "page");
    });

    it("goes back to page 1 when filters are cleared", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockResolvedValueOnce(pageOf(45, 20, listing(2, "2 Next Page Ln")))
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");
      await user.click(pageButton(2));
      await screen.findByText("2 Next Page Ln");

      await user.click(screen.getByRole("button", { name: "Clear Filters" }));

      await screen.findByText("1 All St");
      expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 0 }, expect.anything());
    });

    it("ignores a slow response for a page the user has already left", async () => {
      const second = deferred();
      const third = deferred();
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockReturnValueOnce(second.promise)
        .mockReturnValueOnce(third.promise);
      render(<ListingsPage />);
      await screen.findByText("1 All St");
      await user.click(pageButton(2));
      // Loading: the controls are gone, so leave through a new search instead
      await user.click(screen.getByRole("button", { name: "Clear Filters" }));

      await act(async () => second.resolve(pageOf(45, 20, listing(2, "2 Stale Page Ln"))));
      expect(screen.queryByText("2 Stale Page Ln")).not.toBeInTheDocument();

      await act(async () => third.resolve(pageOf(45, 0, listing(1, "1 All St"))));
      expect(screen.getByText("1 All St")).toBeInTheDocument();
    });

    it("moves to the new last page if the current page no longer exists", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockResolvedValueOnce(pageOf(30, 40))
        .mockResolvedValueOnce(pageOf(30, 20, listing(2, "2 New Last Ln")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");

      await user.click(pageButton(3));

      expect(await screen.findByText("2 New Last Ln")).toBeInTheDocument();
      expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 20 }, expect.anything());
      expect(screen.queryByText("No properties found.")).not.toBeInTheDocument();
    });

    it("retries the page the user was on", async () => {
      vi.mocked(fetchProperties)
        .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
        .mockRejectedValueOnce(new Error("Could not reach the property server."))
        .mockResolvedValueOnce(pageOf(45, 20, listing(2, "2 Next Page Ln")));
      render(<ListingsPage />);
      await screen.findByText("1 All St");
      await user.click(pageButton(2));
      await screen.findByText("Could not reach the property server.");

      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("2 Next Page Ln")).toBeInTheDocument();
      expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 20 }, expect.anything());
    });
  });
});
