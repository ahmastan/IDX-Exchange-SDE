import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PropertyMap from "./PropertyMap";
import { getCoordinates } from "../utils/map";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PropertyMap", () => {
  it("renders a Maps Embed iframe centered on the property", () => {
    render(<PropertyMap latitude={34.156356} longitude={-118.417379} label="4719 Wortser" apiKey="test-key" />);
    const frame = screen.getByTitle("Map of 4719 Wortser");
    const src = new URL(frame.getAttribute("src"));
    expect(src.origin + src.pathname).toBe("https://www.google.com/maps/embed/v1/place");
    expect(src.searchParams.get("key")).toBe("test-key");
    expect(src.searchParams.get("q")).toBe("34.156356,-118.417379");
    expect(src.searchParams.get("zoom")).toBe("15");
  });

  it("reads the API key from REACT_APP_GOOGLE_MAPS_API_KEY", () => {
    vi.stubEnv("REACT_APP_GOOGLE_MAPS_API_KEY", "env-key");
    render(<PropertyMap latitude={34} longitude={-118} />);
    const src = new URL(screen.getByTitle("Property location map").getAttribute("src"));
    expect(src.searchParams.get("key")).toBe("env-key");
  });

  it("has a Get Directions link that opens Google Maps in a new tab", () => {
    render(<PropertyMap latitude="34.1" longitude="-118.4" apiKey="k" />);
    const link = screen.getByRole("link", { name: /Get Directions/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    const href = new URL(link.getAttribute("href"));
    expect(href.searchParams.get("destination")).toBe("34.1,-118.4");
  });

  it("shows a setup hint instead of a broken map when the key is missing", () => {
    vi.stubEnv("REACT_APP_GOOGLE_MAPS_API_KEY", "");
    render(<PropertyMap latitude={34} longitude={-118} />);
    expect(screen.queryByTitle(/map/i)).not.toBeInTheDocument();
    expect(screen.getByText(/REACT_APP_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get Directions/ })).toBeInTheDocument();
  });

  it.each([
    [null, -118],
    [34, null],
    [undefined, undefined],
    ["", ""],
    [0, 0],
    ["abc", -118],
    [123, -118],
  ])("renders nothing when lat=%j lng=%j", (latitude, longitude) => {
    const { container } = render(<PropertyMap latitude={latitude} longitude={longitude} apiKey="k" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("getCoordinates", () => {
  it("accepts numeric strings from DECIMAL columns", () => {
    expect(getCoordinates("34.5", "-118.25")).toEqual({ lat: 34.5, lng: -118.25 });
  });
});
