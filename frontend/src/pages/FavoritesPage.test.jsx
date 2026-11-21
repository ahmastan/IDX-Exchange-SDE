import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fetchProperties, fetchPropertyDetail, fetchOpenHouses } from "../api/client";
import App from "../App";

vi.mock("../api/client", () => ({
  fetchProperties: vi.fn(),
  fetchPropertyDetail: vi.fn(),
  fetchOpenHouses: vi.fn(),
  fetchOpenHouseCalendar: vi.fn(),
}));

const HOUSE = { L_ListingID: "111", L_Address: "1 Elm St", L_City: "Irvine", L_SystemPrice: 900000, L_Photos: [] };
const CONDO = { L_ListingID: "222", L_Address: "2 Oak Ave", L_City: "Irvine", L_SystemPrice: 500000, L_Photos: [] };

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

const favoritesLink = () => screen.getByRole("link", { name: /^Favorites/ });

let user;

beforeEach(() => {
  vi.mocked(fetchProperties).mockReset().mockResolvedValue({ total: 2, limit: 20, offset: 0, results: [HOUSE, CONDO] });
  vi.mocked(fetchPropertyDetail).mockReset().mockResolvedValue({ ...HOUSE, L_Remarks: "Lovely." });
  vi.mocked(fetchOpenHouses).mockReset().mockResolvedValue([]);
  window.scrollTo = vi.fn();
  user = userEvent.setup();
});

describe("favorites", () => {
  it("the heart toggles between empty and filled", async () => {
    renderApp();
    const heart = await screen.findByRole("button", { name: "Save 1 Elm St to favorites" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    expect(heart.querySelector("path")).toHaveAttribute("fill", "none");

    await user.click(heart);

    const saved = screen.getByRole("button", { name: "Remove 1 Elm St from favorites" });
    expect(saved).toHaveAttribute("aria-pressed", "true");
    expect(saved.querySelector("path")).toHaveAttribute("fill", "currentColor");
  });

  it("clicking the heart does not open the property", async () => {
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    expect(screen.getByRole("heading", { name: "Property Listings" })).toBeInTheDocument();
    expect(fetchPropertyDetail).not.toHaveBeenCalled();
  });

  it("the header shows how many properties are saved", async () => {
    renderApp();
    expect(favoritesLink()).toHaveTextContent("0");
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    await user.click(screen.getByRole("button", { name: "Save 2 Oak Ave to favorites" }));
    expect(favoritesLink()).toHaveTextContent("2");
  });

  it("favorites persist after the app is reloaded", async () => {
    const first = renderApp();
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    first.unmount();

    renderApp("/favorites");
    const grid = screen.getByRole("region", { name: "Favorite properties" });
    expect(within(grid).getByText("1 Elm St")).toBeInTheDocument();
    expect(favoritesLink()).toHaveTextContent("1");
  });

  it("the Favorites page lists only saved properties, newest first", async () => {
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    await user.click(screen.getByRole("button", { name: "Save 2 Oak Ave to favorites" }));
    await user.click(favoritesLink());

    expect(screen.getByRole("heading", { name: "Favorites" })).toBeInTheDocument();
    const links = within(screen.getByRole("region", { name: "Favorite properties" })).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["2 Oak Ave", "1 Elm St"]);
  });

  it("unfavoriting removes the property from the Favorites page immediately", async () => {
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    await user.click(screen.getByRole("button", { name: "Save 2 Oak Ave to favorites" }));
    await user.click(favoritesLink());

    await user.click(screen.getByRole("button", { name: "Remove 1 Elm St from favorites" }));

    expect(screen.queryByText("1 Elm St")).not.toBeInTheDocument();
    expect(screen.getByText("2 Oak Ave")).toBeInTheDocument();
    expect(screen.getByText("1 saved property")).toBeInTheDocument();
  });

  it("shows an empty state with a way back to the listings", () => {
    renderApp("/favorites");
    expect(screen.getByText("Nothing saved yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse listings" })).toHaveAttribute("href", "/");
  });

  it("a property can be saved from its detail page", async () => {
    renderApp("/property/111");
    await user.click(await screen.findByRole("button", { name: "Save 1 Elm St to favorites" }));
    expect(favoritesLink()).toHaveTextContent("1");
  });
});
