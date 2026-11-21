// Runs before every test file.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Adds DOM matchers like toBeInTheDocument() and toHaveValue() to expect()
import "@testing-library/jest-dom/vitest";

// Unmount whatever the previous test rendered and forget saved favorites, so
// tests can't affect each other
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
