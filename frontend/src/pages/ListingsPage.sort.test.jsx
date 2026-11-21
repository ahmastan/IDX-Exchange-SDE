import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fetchProperties } from "../api/client";
import { toSortParams } from "../utils/sort";
import ListingsPage from "./ListingsPage";

vi.mock("../api/client", () => ({ fetchProperties: vi.fn() }));

function listing(id, address) {
  return { L_ListingID: id, L_Address: address, L_City: "Irvine", L_State: "CA", L_Photos: [] };
}

function pageOf(total, offset, ...results) {
  return { total, limit: 20, offset, results };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ListingsPage />
    </MemoryRouter>
  );
}

const sortSelect = () => screen.getByLabelText("Sort by");

let user;

beforeEach(() => {
  vi.mocked(fetchProperties).mockReset();
  window.scrollTo = vi.fn();
  user = userEvent.setup();
});

describe("toSortParams", () => {
  it("splits an option into the API's sortBy and sortOrder", () => {
    expect(toSortParams("L_SystemPrice:desc")).toEqual({ sortBy: "L_SystemPrice", sortOrder: "desc" });
  });

  it("sends nothing for the default or an unknown value", () => {
    expect(toSortParams("")).toEqual({});
    expect(toSortParams("ListPrice:asc")).toEqual({});
  });
});

describe("ListingsPage sorting", () => {
  it("starts in the default order with no sort params", async () => {
    vi.mocked(fetchProperties).mockResolvedValue(pageOf(1, 0, listing(1, "1 All St")));
    renderPage();
    await screen.findByText("1 All St");
    expect(sortSelect()).toHaveValue("");
    expect(fetchProperties).toHaveBeenCalledWith({ limit: 20, offset: 0 }, expect.anything());
  });

  it("refetches with the chosen sort, keeping the filters and going back to page 1", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
      .mockResolvedValueOnce(pageOf(45, 0, listing(2, "2 Irvine Rd")))
      .mockResolvedValueOnce(pageOf(45, 20, listing(3, "3 Page Two")))
      .mockResolvedValueOnce(pageOf(45, 0, listing(4, "4 Cheapest")));
    renderPage();
    await screen.findByText("1 All St");
    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("2 Irvine Rd");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("3 Page Two");

    await user.selectOptions(sortSelect(), "Price: low to high");

    expect(await screen.findByText("4 Cheapest")).toBeInTheDocument();
    expect(fetchProperties).toHaveBeenLastCalledWith(
      { city: "Irvine", sortBy: "L_SystemPrice", sortOrder: "asc", limit: 20, offset: 0 },
      expect.anything()
    );
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the sort when changing pages", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(pageOf(45, 0, listing(1, "1 All St")))
      .mockResolvedValueOnce(pageOf(45, 0, listing(2, "2 Newest")))
      .mockResolvedValueOnce(pageOf(45, 20, listing(3, "3 Older")));
    renderPage();
    await screen.findByText("1 All St");
    await user.selectOptions(sortSelect(), "Newest listed");
    await screen.findByText("2 Newest");

    await user.click(screen.getByRole("button", { name: "Page 2" }));

    expect(await screen.findByText("3 Older")).toBeInTheDocument();
    expect(fetchProperties).toHaveBeenLastCalledWith(
      { sortBy: "ListingContractDate", sortOrder: "desc", limit: 20, offset: 20 },
      expect.anything()
    );
    expect(sortSelect()).toHaveValue("ListingContractDate:desc");
  });

  it("resets the sort when new filters are applied", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(pageOf(1, 0, listing(1, "1 All St")))
      .mockResolvedValueOnce(pageOf(1, 0, listing(2, "2 Priciest")))
      .mockResolvedValueOnce(pageOf(1, 0, listing(3, "3 Irvine Rd")));
    renderPage();
    await screen.findByText("1 All St");
    await user.selectOptions(sortSelect(), "Price: high to low");
    await screen.findByText("2 Priciest");

    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByText("3 Irvine Rd");
    expect(fetchProperties).toHaveBeenLastCalledWith({ city: "Irvine", limit: 20, offset: 0 }, expect.anything());
    expect(sortSelect()).toHaveValue("");
    expect(fetchProperties).toHaveBeenCalledTimes(3);
  });

  it("resets the sort when filters are cleared", async () => {
    vi.mocked(fetchProperties)
      .mockResolvedValueOnce(pageOf(1, 0, listing(1, "1 All St")))
      .mockResolvedValueOnce(pageOf(1, 0, listing(2, "2 Biggest")))
      .mockResolvedValueOnce(pageOf(1, 0, listing(1, "1 All St")));
    renderPage();
    await screen.findByText("1 All St");
    await user.selectOptions(sortSelect(), "Square feet: largest");
    await screen.findByText("2 Biggest");

    await user.click(screen.getByRole("button", { name: "Clear Filters" }));

    await screen.findByText("1 All St");
    expect(sortSelect()).toHaveValue("");
    expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 0 }, expect.anything());
  });
});
