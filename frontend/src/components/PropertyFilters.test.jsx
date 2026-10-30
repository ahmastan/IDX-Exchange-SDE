import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyFilters from "./PropertyFilters";

let onSearch;
let onClear;
let user;

beforeEach(() => {
  // Mock callbacks record how the component calls them
  onSearch = vi.fn();
  onClear = vi.fn();
  user = userEvent.setup();
  render(<PropertyFilters onSearch={onSearch} onClear={onClear} />);
});

function search() {
  return user.click(screen.getByRole("button", { name: "Search" }));
}

describe("PropertyFilters", () => {
  it("renders all six filter inputs", () => {
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toBeInTheDocument();
    expect(screen.getByLabelText("Min price")).toBeInTheDocument();
    expect(screen.getByLabelText("Max price")).toBeInTheDocument();
    expect(screen.getByLabelText("Beds").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Baths").tagName).toBe("SELECT");
  });

  it("calls onSearch with every filled-in filter combined", async () => {
    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.type(screen.getByLabelText("ZIP code"), "92614");
    await user.type(screen.getByLabelText("Min price"), "500000");
    await user.type(screen.getByLabelText("Max price"), "900000");
    await user.selectOptions(screen.getByLabelText("Beds"), "3");
    await user.selectOptions(screen.getByLabelText("Baths"), "1.5");
    await search();

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith({
      city: "Irvine",
      zipcode: "92614",
      minPrice: "500000",
      maxPrice: "900000",
      beds: "3",
      baths: "1.5",
    });
  });

  it("leaves empty fields out and trims whitespace", async () => {
    await user.type(screen.getByLabelText("City"), "  San Diego  ");
    await search();

    expect(onSearch).toHaveBeenCalledWith({ city: "San Diego" });
  });

  it("searches with no filters when every field is empty", async () => {
    await search();

    expect(onSearch).toHaveBeenCalledWith({});
  });

  it("submits when Enter is pressed in a field", async () => {
    await user.type(screen.getByLabelText("City"), "Irvine{Enter}");

    expect(onSearch).toHaveBeenCalledWith({ city: "Irvine" });
  });

  it("Clear Filters resets every input and calls onClear", async () => {
    await user.type(screen.getByLabelText("City"), "Irvine");
    await user.type(screen.getByLabelText("ZIP code"), "92614");
    await user.type(screen.getByLabelText("Min price"), "100");
    await user.type(screen.getByLabelText("Max price"), "200");
    await user.selectOptions(screen.getByLabelText("Beds"), "2");
    await user.selectOptions(screen.getByLabelText("Baths"), "2");

    await user.click(screen.getByRole("button", { name: "Clear Filters" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("ZIP code")).toHaveValue("");
    expect(screen.getByLabelText("Min price")).toHaveValue(null); // empty number input
    expect(screen.getByLabelText("Max price")).toHaveValue(null);
    expect(screen.getByLabelText("Beds")).toHaveValue("");
    expect(screen.getByLabelText("Baths")).toHaveValue("");
  });

  it("shows an error and does not search for a ZIP code that isn't 5 digits", async () => {
    await user.type(screen.getByLabelText("ZIP code"), "926");
    await search();

    expect(screen.getByRole("alert")).toHaveTextContent("ZIP code must be exactly 5 digits.");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows an error and does not search when min price is above max price", async () => {
    await user.type(screen.getByLabelText("Min price"), "900000");
    await user.type(screen.getByLabelText("Max price"), "500000");
    await search();

    expect(screen.getByRole("alert")).toHaveTextContent("Min price can't be more than max price.");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("removes the error once the filters are fixed", async () => {
    await user.type(screen.getByLabelText("ZIP code"), "926");
    await search();
    await user.type(screen.getByLabelText("ZIP code"), "14");
    await search();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledWith({ zipcode: "92614" });
  });
});
