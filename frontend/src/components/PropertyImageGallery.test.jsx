import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import PropertyImageGallery from "./PropertyImageGallery";

const PHOTOS = ["https://img.test/1.jpg", "https://img.test/2.jpg", "https://img.test/3.jpg"];

function mainPhoto() {
  return within(screen.getByRole("button", { name: "Open full-screen photo viewer" })).getByRole("img");
}

function openLightbox() {
  fireEvent.click(screen.getByRole("button", { name: "Open full-screen photo viewer" }));
  return screen.getByRole("dialog", { name: "Photo viewer" });
}

describe("PropertyImageGallery", () => {
  it("shows the first photo and a thumbnail for every photo", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    expect(mainPhoto()).toHaveAttribute("src", PHOTOS[0]);
    expect(screen.getAllByRole("button", { name: /^Show photo/ })).toHaveLength(3);
  });

  it("clicking a thumbnail updates the main photo", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    fireEvent.click(screen.getByRole("button", { name: "Show photo 3" }));
    expect(mainPhoto()).toHaveAttribute("src", PHOTOS[2]);
    expect(screen.getByRole("button", { name: "Show photo 3" })).toHaveAttribute("aria-current", "true");
  });

  it("clicking the main photo opens a lightbox showing the same photo", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    fireEvent.click(screen.getByRole("button", { name: "Show photo 2" }));
    const dialog = openLightbox();
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", PHOTOS[1]);
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
  });

  it("focuses the lightbox so it receives keyboard events", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog).toHaveFocus();
  });

  it("Escape closes the lightbox and returns focus to the main photo", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open full-screen photo viewer" })).toHaveFocus();
  });

  it("left and right arrow keys move between photos, wrapping around", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    const lightboxPhoto = () => within(dialog).getByRole("img");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(lightboxPhoto()).toHaveAttribute("src", PHOTOS[1]);
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(lightboxPhoto()).toHaveAttribute("src", PHOTOS[2]);
  });

  it("the lightbox arrow buttons navigate without closing it", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", PHOTOS[1]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clicking outside the photo closes the lightbox, clicking the photo does not", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();

    fireEvent.click(within(dialog).getByRole("img"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("the close button closes the lightbox", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close photo viewer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("locks page scrolling while the lightbox is open", () => {
    render(<PropertyImageGallery photos={PHOTOS} alt="Photo" />);
    const dialog = openLightbox();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("works with a single photo: no thumbnails or arrows, lightbox still opens", () => {
    render(<PropertyImageGallery photos={JSON.stringify([PHOTOS[0]])} alt="Photo" />);
    expect(screen.queryByRole("button", { name: /^Show photo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();

    const dialog = openLightbox();
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", PHOTOS[0]);
    expect(within(dialog).queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    // Arrow keys do nothing harmful with one photo
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", PHOTOS[0]);
  });

  it("shows a placeholder when there are no photos", () => {
    render(<PropertyImageGallery photos="" alt="Photo" />);
    expect(screen.getByText("No photos available")).toBeInTheDocument();
  });
});
