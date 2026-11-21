import { SORT_OPTIONS } from "../utils/sort";

// Controlled: the listings page owns the sort, so it can reset this control
// when a new search starts.
export default function SortSelect({ value, onChange }) {
  return (
    <label className="sort-select">
      <span>Sort by</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
