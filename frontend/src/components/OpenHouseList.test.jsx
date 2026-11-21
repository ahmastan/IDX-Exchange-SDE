import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import OpenHouseList from "./OpenHouseList";

function openHouse(overrides = {}) {
  return {
    id: 1,
    L_ListingID: "1175978785",
    OpenHouseDate: "2099-09-20",
    OH_StartTime: "13:00:00",
    OH_EndTime: "16:00:00",
    all_data: JSON.stringify({ OpenHouseType: "Public", OpenHouseRemarks: "Come see the pool!" }),
    ...overrides,
  };
}

describe("OpenHouseList", () => {
  it("shows the date, formatted times, and remarks from all_data", () => {
    render(<OpenHouseList openHouses={[openHouse()]} />);
    expect(screen.getByText("Sun, Sep 20, 2099")).toBeInTheDocument();
    expect(screen.getByText("1:00 PM – 4:00 PM")).toBeInTheDocument();
    expect(screen.getByText("Come see the pool!")).toBeInTheDocument();
  });

  it("leaves out remarks when there are none, or all_data is malformed", () => {
    render(
      <OpenHouseList
        openHouses={[
          openHouse({ id: 1, all_data: JSON.stringify({ OpenHouseRemarks: null }) }),
          openHouse({ id: 2, all_data: "{not json" }),
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(within(item).getByText("1:00 PM – 4:00 PM")).toBeInTheDocument();
      expect(item.querySelector(".open-houses__remarks")).toBeNull();
    }
  });

  it("renders every open house in the order given", () => {
    render(
      <OpenHouseList
        openHouses={[
          openHouse({ id: 1, OpenHouseDate: "2099-09-20" }),
          openHouse({ id: 2, OpenHouseDate: "2099-09-21", OH_StartTime: "10:00:00", OH_EndTime: "12:00:00" }),
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Sep 20, 2099");
    expect(items[1]).toHaveTextContent("Sep 21, 2099");
    expect(items[1]).toHaveTextContent("10:00 AM – 12:00 PM");
  });

  it("labels open houses that have already happened", () => {
    render(<OpenHouseList openHouses={[openHouse({ OpenHouseDate: "2001-01-06" })]} />);
    expect(screen.getByText("Past")).toBeInTheDocument();
  });

  it.each([[[]], [null], [undefined]])("shows 'No open houses scheduled' for %j", (openHouses) => {
    render(<OpenHouseList openHouses={openHouses} />);
    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
  });
});
