import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PropertyImageCarousel from "./PropertyImageCarousel";

const PHOTOS = ["https://img.test/1.jpg", "https://img.test/2.jpg", "https://img.test/3.jpg"];

function shownPhoto() {
  return screen.getByRole("img").getAttribute("src");
}

describe("PropertyImageCarousel", () => {
  it("starts on the first photo with a counter", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="Photo of 1 Main St" />);
    expect(shownPhoto()).toBe(PHOTOS[0]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("cycles forward and backward, wrapping at both ends", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="Photo" />);
    const next = screen.getByRole("button", { name: "Next photo" });
    const prev = screen.getByRole("button", { name: "Previous photo" });

    fireEvent.click(next);
    expect(shownPhoto()).toBe(PHOTOS[1]);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(next);
    fireEvent.click(next);
    expect(shownPhoto()).toBe(PHOTOS[0]);

    fireEvent.click(prev);
    expect(shownPhoto()).toBe(PHOTOS[2]);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("parses L_Photos when it arrives as a JSON string", () => {
    render(<PropertyImageCarousel photos={JSON.stringify(PHOTOS)} alt="Photo" />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("hides the arrows and counter for a single photo", () => {
    render(<PropertyImageCarousel photos={[PHOTOS[0]]} alt="Photo" />);
    expect(shownPhoto()).toBe(PHOTOS[0]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it.each([[[]], [null], [""], ["{broken"]])("shows a placeholder for %j", (photos) => {
    render(<PropertyImageCarousel photos={photos} alt="Photo" />);
    expect(screen.getByText("No photo available")).toBeInTheDocument();
  });

  it("skips a photo that fails to load", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="Photo" />);
    fireEvent.error(screen.getByRole("img"));
    expect(shownPhoto()).toBe(PHOTOS[1]);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("does not trigger the click handler or link it sits inside", () => {
    let cardClicks = 0;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <a href="/property/1" onClick={() => cardClicks++}>
                <PropertyImageCarousel photos={PHOTOS} alt="Photo" />
              </a>
            }
          />
          <Route path="/property/:id" element={<p>Detail page</p>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));

    expect(cardClicks).toBe(0);
    expect(screen.queryByText("Detail page")).not.toBeInTheDocument();
  });
});
