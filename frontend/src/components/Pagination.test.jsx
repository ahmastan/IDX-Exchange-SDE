import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "./Pagination";

const onPageChange = vi.fn();

beforeEach(() => onPageChange.mockReset());

function renderPagination(currentPage, totalPages) {
  return render(
    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
  );
}

// The bar as the user reads it, e.g. "Previous 1 … 4 5 6 … 24 Next"
function barText() {
  return Array.from(screen.getByRole("navigation").children)
    .map((el) => el.textContent)
    .join(" ");
}

const previous = () => screen.getByRole("button", { name: "Previous" });
const next = () => screen.getByRole("button", { name: "Next" });
const pageButton = (n) => screen.getByRole("button", { name: `Page ${n}` });

describe("Pagination", () => {
  describe("visibility", () => {
    it("renders nothing when there is only one page", () => {
      const { container } = renderPagination(1, 1);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when there are no pages", () => {
      const { container } = renderPagination(1, 0);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders with two pages", () => {
      renderPagination(1, 2);
      expect(barText()).toBe("Previous 1 2 Next");
    });
  });

  describe("first page", () => {
    it("disables Previous and enables Next", () => {
      renderPagination(1, 24);
      expect(previous()).toBeDisabled();
      expect(next()).toBeEnabled();
    });

    it("does not report a page change when disabled Previous is clicked", () => {
      renderPagination(1, 24);
      fireEvent.click(previous());
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("Next goes to page 2", () => {
      renderPagination(1, 24);
      fireEvent.click(next());
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
    });
  });

  describe("last page", () => {
    it("disables Next and enables Previous", () => {
      renderPagination(24, 24);
      expect(next()).toBeDisabled();
      expect(previous()).toBeEnabled();
    });

    it("does not report a page change when disabled Next is clicked", () => {
      renderPagination(24, 24);
      fireEvent.click(next());
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("Previous goes to the page before", () => {
      renderPagination(24, 24);
      fireEvent.click(previous());
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(23);
    });
  });

  describe("middle page", () => {
    it("enables both Previous and Next, which move one page each way", () => {
      renderPagination(5, 24);
      expect(previous()).toBeEnabled();
      expect(next()).toBeEnabled();

      fireEvent.click(previous());
      expect(onPageChange).toHaveBeenLastCalledWith(4);
      fireEvent.click(next());
      expect(onPageChange).toHaveBeenLastCalledWith(6);
    });

    it("marks only the current page as current", () => {
      renderPagination(5, 24);
      expect(pageButton(5)).toHaveAttribute("aria-current", "page");
      expect(pageButton(4)).not.toHaveAttribute("aria-current");
      expect(pageButton(6)).not.toHaveAttribute("aria-current");
    });
  });

  describe("page number clicks", () => {
    it("reports the page that was clicked", () => {
      renderPagination(5, 24);
      fireEvent.click(pageButton(24));
      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(24);
    });

    it("does nothing when the current page is clicked", () => {
      renderPagination(5, 24);
      fireEvent.click(pageButton(5));
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("ellipsis rendering", () => {
    it("shows no ellipsis when every page fits", () => {
      renderPagination(3, 7);
      expect(barText()).toBe("Previous 1 2 3 4 5 6 7 Next");
    });

    it("shows one ellipsis near the start", () => {
      renderPagination(2, 24);
      expect(barText()).toBe("Previous 1 2 3 4 5 … 24 Next");
    });

    it("shows two ellipses in the middle, matching the guide's example", () => {
      renderPagination(5, 24);
      expect(barText()).toBe("Previous 1 … 4 5 6 … 24 Next");
    });

    it("shows one ellipsis near the end", () => {
      renderPagination(23, 24);
      expect(barText()).toBe("Previous 1 … 20 21 22 23 24 Next");
    });

    it("does not make the ellipsis clickable", () => {
      renderPagination(5, 24);
      const buttons = screen.getAllByRole("button").map((b) => b.textContent);
      expect(buttons).not.toContain("…");
    });
  });

  // Debug challenge: the last page must show once on every page near the end
  it.each([20, 21, 22, 23, 24])("shows page 24 exactly once on page %i of 24", (page) => {
    renderPagination(page, 24);
    expect(screen.getAllByRole("button", { name: "Page 24" })).toHaveLength(1);
  });
});
