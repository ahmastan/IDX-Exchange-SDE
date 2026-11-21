import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fetchOpenHouses, fetchProperties, fetchPropertyDetail } from "./api/client";
import App from "./App";

vi.mock("./api/client", () => ({
  fetchProperties: vi.fn(),
  fetchPropertyDetail: vi.fn(),
  fetchOpenHouses: vi.fn(),
}));

const LISTING = {
  L_ListingID: "1175978785",
  L_Address: "4719 Wortser",
  L_City: "Sherman Oaks",
  L_State: "CA",
  L_SystemPrice: 1449000,
  L_Photos: ["https://img.test/1.jpg", "https://img.test/2.jpg"],
};

beforeEach(() => {
  vi.mocked(fetchProperties).mockReset().mockResolvedValue({ total: 1, limit: 20, offset: 0, results: [LISTING] });
  vi.mocked(fetchPropertyDetail).mockReset().mockResolvedValue({ ...LISTING, L_Remarks: "Lovely home." });
  vi.mocked(fetchOpenHouses).mockReset().mockResolvedValue([]);
  window.scrollTo = vi.fn();
});

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("App routing", () => {
  it("listings → detail → back", async () => {
    const user = userEvent.setup();
    renderApp();

    const cardLink = await screen.findByRole("link", { name: "4719 Wortser" });
    expect(cardLink).toHaveAttribute("href", "/property/1175978785");
    await user.click(cardLink);

    expect(await screen.findByText("Lovely home.")).toBeInTheDocument();
    expect(fetchPropertyDetail).toHaveBeenCalledWith("1175978785", expect.anything());

    await user.click(screen.getByRole("link", { name: "← Back to listings" }));
    expect(await screen.findByRole("heading", { name: "Property Listings" })).toBeInTheDocument();
  });

  it("the carousel arrows on a card change the photo without leaving the listings", async () => {
    renderApp();
    await screen.findByRole("link", { name: "4719 Wortser" });
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Property Listings" })).toBeInTheDocument();
    expect(fetchPropertyDetail).not.toHaveBeenCalled();
  });

  it("shows a not-found page for unknown URLs", () => {
    renderApp("/nowhere");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
