import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

// A child that throws while rendering whenever `shouldThrow.current` is true
const shouldThrow = { current: true };
function Bomb() {
  if (shouldThrow.current) throw new Error("Boom");
  return <p>All good</p>;
}

function renderBoundary(props = {}) {
  return render(
    <MemoryRouter>
      <ErrorBoundary {...props}>
        <Bomb />
      </ErrorBoundary>
    </MemoryRouter>
  );
}

beforeEach(() => {
  shouldThrow.current = true;
  // React logs caught render errors to console.error; keep the output clean
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    shouldThrow.current = false;
    renderBoundary();
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a recovery screen instead of a blank page when a child throws", () => {
    renderBoundary();
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("link", { name: "Back to listings" })).toHaveAttribute("href", "/");
  });

  it("reports the error through onError", () => {
    const onError = vi.fn();
    renderBoundary({ onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Boom" }), expect.anything());
  });

  it("Try again renders the children again", async () => {
    renderBoundary();
    shouldThrow.current = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("clears the error when resetKey changes (the user navigated)", () => {
    const { rerender } = renderBoundary({ resetKey: "/a" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    shouldThrow.current = false;
    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKey="/b">
          <Bomb />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });
});
