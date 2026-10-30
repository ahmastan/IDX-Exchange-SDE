import { useState } from "react";
import { cleanFilters, EMPTY_FILTERS, validateFilters } from "../utils/filters";
import "./PropertyFilters.css";

// The backend treats beds and baths as minimums ("3" means 3 or more)
const BED_OPTIONS = ["1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["1", "1.5", "2", "3", "4"];

// The filter form. It owns the draft values while the user types and only
// reports them to the parent on Search, already trimmed with blanks removed.
export default function PropertyFilters({ onSearch, onClear }) {
  const [values, setValues] = useState(EMPTY_FILTERS);
  const [error, setError] = useState(null);

  // One handler for every input: the input's name is the key in `values`
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const filters = cleanFilters(values);
    const message = validateFilters(filters);
    setError(message);
    if (!message) onSearch(filters);
  }

  function handleClear() {
    setValues(EMPTY_FILTERS);
    setError(null);
    onClear();
  }

  return (
    <form className="property-filters" onSubmit={handleSubmit} noValidate aria-label="Filter properties">
      <div className="property-filters__fields">
        <label className="property-filters__field">
          <span>City</span>
          <input name="city" value={values.city} onChange={handleChange} placeholder="Any city" maxLength={50} />
        </label>

        <label className="property-filters__field">
          <span>ZIP code</span>
          <input
            name="zipcode"
            value={values.zipcode}
            onChange={handleChange}
            placeholder="e.g. 92614"
            inputMode="numeric"
            maxLength={5}
          />
        </label>

        <label className="property-filters__field">
          <span>Min price</span>
          <input
            name="minPrice"
            type="number"
            min="0"
            step="1"
            value={values.minPrice}
            onChange={handleChange}
            placeholder="No min"
          />
        </label>

        <label className="property-filters__field">
          <span>Max price</span>
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="1"
            value={values.maxPrice}
            onChange={handleChange}
            placeholder="No max"
          />
        </label>

        <label className="property-filters__field">
          <span>Beds</span>
          <select name="beds" value={values.beds} onChange={handleChange}>
            <option value="">Any</option>
            {BED_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </label>

        <label className="property-filters__field">
          <span>Baths</span>
          <select name="baths" value={values.baths} onChange={handleChange}>
            <option value="">Any</option>
            {BATH_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="property-filters__error" role="alert">
          {error}
        </p>
      )}

      <div className="property-filters__actions">
        <button type="submit" className="property-filters__search">Search</button>
        <button type="button" className="property-filters__clear" onClick={handleClear}>
          Clear Filters
        </button>
      </div>
    </form>
  );
}
