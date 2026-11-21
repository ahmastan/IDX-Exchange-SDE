import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError, fetchOpenHouses, fetchPropertyDetail } from "../api/client";
import PropertyDetailPage from "./PropertyDetailPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return { ApiError: actual.ApiError, fetchPropertyDetail: vi.fn(), fetchOpenHouses: vi.fn() };
});

const PROPERTY = {
  L_ListingID: "1175978785",
  L_DisplayId: "1175978785",
  L_Address: "4719 Wortser",
  L_City: "Sherman Oaks",
  L_State: "CA",
  L_Zip: "91423",
  L_SystemPrice: 1449000,
  L_Keyword2: 3,
  LM_Dec_3: "2.5",
  LM_Int2_3: 2029,
  YearBuilt: 1940,
  LotSizeAcres: 0.2016,
  LotSizeSquareFeet: 8783,
  L_Type_: "SingleFamilyResidence",
  StandardStatus: "Active",
  Cooling: "CentralAir",
  L_Remarks: "Buy in one of Sherman Oaks' most desirable neighborhoods.",
  L_Photos: ["https://img.test/1.jpg", "https://img.test/2.jpg"],
  LMD_MP_Latitude: 34.156356,
  LMD_MP_Longitude: -118.417379,
  ListAgentFullName: "Pat Agent",
  LO1_OrganizationName: "Example Realty",
};

const OPEN_HOUSE = {
  id: 7,
  L_ListingID: "1175978785",
  OpenHouseDate: "2099-09-20",
  OH_StartTime: "13:00:00",
  OH_EndTime: "16:00:00",
  all_data: JSON.stringify({ OpenHouseRemarks: "Seller credit available" }),
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Listings page</p>} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(fetchPropertyDetail).mockReset().mockResolvedValue(PROPERTY);
  vi.mocked(fetchOpenHouses).mockReset().mockResolvedValue([OPEN_HOUSE]);
});

describe("PropertyDetailPage", () => {
  it("fetches the property and its open houses for the id in the URL", async () => {
    renderAt("/property/1175978785");
    expect(screen.getByRole("status")).toHaveTextContent("Loading property");
    await screen.findByRole("heading", { name: "4719 Wortser" });
    expect(fetchPropertyDetail).toHaveBeenCalledWith("1175978785", expect.anything());
    expect(fetchOpenHouses).toHaveBeenCalledWith("1175978785", expect.anything());
  });

  it("shows price, address, stats, description, and property details", async () => {
    renderAt("/property/1175978785");
    await screen.findByRole("heading", { name: "4719 Wortser" });

    expect(screen.getByText("$1,449,000")).toBeInTheDocument();
    expect(screen.getByText("Sherman Oaks, CA 91423")).toBeInTheDocument();

    const stats = screen.getByRole("list", { name: "Key facts" });
    expect(stats).toHaveTextContent("3beds");
    expect(stats).toHaveTextContent("2.5baths");
    expect(stats).toHaveTextContent("2,029sqft");
    expect(stats).toHaveTextContent("1940year built");

    expect(screen.getByText(/most desirable neighborhoods/)).toBeInTheDocument();
    expect(screen.getByText("Single Family Residence")).toBeInTheDocument();
    expect(screen.getByText("Central Air")).toBeInTheDocument();
    expect(screen.getByText("0.2 acres (8,783 sqft)")).toBeInTheDocument();
    expect(screen.getByText(/Listing courtesy of Pat Agent, Example Realty/)).toBeInTheDocument();
  });

  it("shows the gallery, map, and open houses with remarks", async () => {
    renderAt("/property/1175978785");
    await screen.findByRole("heading", { name: "4719 Wortser" });

    expect(screen.getByRole("button", { name: "Open full-screen photo viewer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get Directions/ })).toBeInTheDocument();

    const openHouses = screen.getByRole("region", { name: "Open houses" });
    expect(await within(openHouses).findByText("Seller credit available")).toBeInTheDocument();
    expect(within(openHouses).getByText("1:00 PM – 4:00 PM")).toBeInTheDocument();
  });

  it("says when there are no open houses", async () => {
    vi.mocked(fetchOpenHouses).mockResolvedValue([]);
    renderAt("/property/1175978785");
    expect(await screen.findByText("No open houses scheduled")).toBeInTheDocument();
  });

  it("hides the map when the property has no coordinates", async () => {
    vi.mocked(fetchPropertyDetail).mockResolvedValue({ ...PROPERTY, LMD_MP_Latitude: null });
    renderAt("/property/1175978785");
    expect(await screen.findByText("Map location not available.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get Directions/ })).not.toBeInTheDocument();
  });

  it.each([
    [400, "Listing ID must be a number of 1 to 20 digits"],
    [404, "No property found with listing ID 999"],
  ])("shows 'Property not found' instead of crashing on a %i", async (status, message) => {
    vi.mocked(fetchPropertyDetail).mockRejectedValue(new ApiError(message, status));
    vi.mocked(fetchOpenHouses).mockRejectedValue(new ApiError(message, status));
    renderAt("/property/invalid-id");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Property not found");
    expect(within(alert).getByRole("link", { name: "Browse all properties" })).toHaveAttribute("href", "/");
  });

  it("offers a retry when the server is unreachable", async () => {
    vi.mocked(fetchPropertyDetail)
      .mockRejectedValueOnce(new ApiError("Could not reach the property server."))
      .mockResolvedValueOnce(PROPERTY);
    renderAt("/property/1175978785");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not reach the property server.");
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "4719 Wortser" })).toBeInTheDocument();
  });

  it("still shows the property when only the open houses request fails", async () => {
    vi.mocked(fetchOpenHouses).mockRejectedValue(new ApiError("Something went wrong", 500));
    renderAt("/property/1175978785");
    await screen.findByRole("heading", { name: "4719 Wortser" });
    expect(await screen.findByText(/Couldn't load open houses/)).toBeInTheDocument();
  });

  it("the back link goes to the listings page when opened directly", async () => {
    renderAt("/property/1175978785");
    await screen.findByRole("heading", { name: "4719 Wortser" });
    await userEvent.click(screen.getByRole("link", { name: "← Back to listings" }));
    expect(screen.getByText("Listings page")).toBeInTheDocument();
  });
});
