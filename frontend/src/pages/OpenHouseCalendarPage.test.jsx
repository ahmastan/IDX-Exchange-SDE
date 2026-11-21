import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fetchOpenHouseCalendar, fetchOpenHouses, fetchProperties, fetchPropertyDetail } from "../api/client";
import App from "../App";

vi.mock("../api/client", () => ({
  fetchProperties: vi.fn(),
  fetchPropertyDetail: vi.fn(),
  fetchOpenHouses: vi.fn(),
  fetchOpenHouseCalendar: vi.fn(),
}));

function openHouse(id, date, start, address, extra = {}) {
  return {
    id,
    L_ListingID: String(1000 + id),
    OpenHouseDate: date,
    OH_StartTime: start,
    OH_EndTime: "16:00:00",
    OpenHouseType: "Public",
    OpenHouseRemarks: null,
    L_Address: address,
    L_City: "Irvine",
    L_SystemPrice: 750000,
    ...extra,
  };
}

function renderCalendar(month = "2026-09") {
  return render(
    <MemoryRouter initialEntries={[`/open-houses?month=${month}`]}>
      <App />
    </MemoryRouter>
  );
}

const dayButton = (name) => screen.getByRole("button", { name: new RegExp(`^${name}:`) });

let user;

beforeEach(() => {
  vi.mocked(fetchOpenHouseCalendar).mockReset().mockResolvedValue([]);
  vi.mocked(fetchProperties).mockReset();
  vi.mocked(fetchPropertyDetail).mockReset().mockResolvedValue({ L_ListingID: "1001", L_Address: "1 Elm St" });
  vi.mocked(fetchOpenHouses).mockReset().mockResolvedValue([]);
  window.scrollTo = vi.fn();
  user = userEvent.setup();
});

describe("OpenHouseCalendarPage", () => {
  it("requests the whole six-week grid for the month", async () => {
    renderCalendar("2026-09");
    await screen.findByText("No open houses scheduled in September 2026");
    expect(fetchOpenHouseCalendar).toHaveBeenCalledWith("2026-08-30", "2026-10-10", expect.anything());
  });

  it("shows each open house on its own date", async () => {
    vi.mocked(fetchOpenHouseCalendar).mockResolvedValue([
      openHouse(1, "2026-09-19", "13:00:00", "1 Elm St"),
      openHouse(2, "2026-09-20", "10:30:00", "2 Oak Ave"),
    ]);
    renderCalendar();

    const link = await screen.findByRole("link", { name: /1 Elm St/ });
    expect(link.closest("li.calendar__day")).toContainElement(dayButton("Sat, Sep 19, 2026"));
    expect(link).toHaveTextContent("1:00 PM 1 Elm St");
    const oak = screen.getByRole("link", { name: /2 Oak Ave/ });
    expect(oak.closest("li.calendar__day")).toContainElement(dayButton("Sun, Sep 20, 2026"));
    expect(screen.getByText("2 open houses in September 2026")).toBeInTheDocument();
  });

  it("clicking an event opens that property's detail page", async () => {
    vi.mocked(fetchOpenHouseCalendar).mockResolvedValue([openHouse(1, "2026-09-19", "13:00:00", "1 Elm St")]);
    renderCalendar();
    const link = await screen.findByRole("link", { name: /1 Elm St/ });
    expect(link).toHaveAttribute("href", "/property/1001");

    await user.click(link);

    expect(fetchPropertyDetail).toHaveBeenCalledWith("1001", expect.anything());
  });

  it("a busy day shows three events and '+N more', which opens the full day list", async () => {
    vi.mocked(fetchOpenHouseCalendar).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) =>
        openHouse(i + 1, "2026-09-19", `1${i}:00:00`, `${i + 1} Busy St`, {
          OpenHouseRemarks: i === 4 ? "Cookies served" : null,
          OpenHouseType: i === 4 ? "LivestreamPublic" : "Public",
        })
      )
    );
    renderCalendar();
    await screen.findByRole("link", { name: /1 Busy St/ });
    expect(screen.queryByRole("link", { name: /4 Busy St/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+2 more" }));

    const list = screen.getByRole("region", { name: /Sat, Sep 19, 2026/ });
    expect(within(list).getByText("5 open houses")).toBeInTheDocument();
    expect(within(list).getAllByRole("link")).toHaveLength(5);
    // Fields extracted from all_data on the server are shown
    expect(within(list).getByText("Cookies served")).toBeInTheDocument();
    expect(within(list).getByText(/Livestream public open house/)).toBeInTheDocument();
    expect(within(list).getByText("2:00 PM – 4:00 PM")).toBeInTheDocument();
  });

  it("long day lists grow 50 at a time", async () => {
    vi.mocked(fetchOpenHouseCalendar).mockResolvedValue(
      Array.from({ length: 120 }, (_, i) => openHouse(i + 1, "2026-09-19", "13:00:00", `${i + 1} Many St`))
    );
    renderCalendar();
    await user.click(await screen.findByRole("button", { name: "+117 more" }));
    const list = () => within(screen.getByRole("region", { name: /Sat, Sep 19, 2026/ }));
    expect(list().getAllByRole("link")).toHaveLength(50);

    await user.click(screen.getByRole("button", { name: "Show 50 more of 70" }));
    expect(list().getAllByRole("link")).toHaveLength(100);
  });

  it("an empty month says so instead of showing an error", async () => {
    renderCalendar("2025-01");
    expect(await screen.findByText("No open houses scheduled in January 2025")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("previous and next move between months and refetch", async () => {
    renderCalendar("2026-09");
    await screen.findByText("No open houses scheduled in September 2026");

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("No open houses scheduled in October 2026")).toBeInTheDocument();
    expect(fetchOpenHouseCalendar).toHaveBeenLastCalledWith("2026-09-27", "2026-11-07", expect.anything());

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByRole("heading", { name: "August 2026" })).toBeInTheDocument();
  });

  it("shows the error with a retry when the request fails", async () => {
    vi.mocked(fetchOpenHouseCalendar)
      .mockRejectedValueOnce(new Error("Could not reach the property server."))
      .mockResolvedValueOnce([openHouse(1, "2026-09-19", "13:00:00", "1 Elm St")]);
    renderCalendar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the property server.");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /1 Elm St/ })).toBeInTheDocument();
  });

  it("falls back to the current month for a bad ?month value", async () => {
    renderCalendar("garbage");
    await screen.findByText(/No open houses scheduled in/);
    const now = new Date();
    const label = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
  });
});
