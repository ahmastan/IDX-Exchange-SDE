import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import { formatNumber } from "../utils/format";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import "./ListingsPage.css";

const PAGE_SIZE = 20;
const LOADING = { status: "loading", data: null, error: null };

export default function ListingsPage() {
  // status is "loading", "error", or "success"
  const [state, setState] = useState(LOADING);
  // The filters from the last Search, already cleaned by PropertyFilters.
  // Search and Clear always set a new object, so the effect below re-runs even
  // when the values are the same as before.
  const [filters, setFilters] = useState({});
  // Bumping this re-runs the effect, which is how "Try again" refetches
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Only the request for the current filters may update the page. When the
    // filters change, cleanup aborts the previous request, so a slow older
    // response can't land after a newer one and replace the right results
    // (part of the Week 6 debug challenge). This also covers StrictMode
    // running effects twice in development.
    const controller = new AbortController();
    fetchProperties({ ...filters, limit: PAGE_SIZE, offset: 0 }, { signal: controller.signal })
      .then((data) => {
        // Belt and braces: never apply a response for a cancelled request
        if (controller.signal.aborted) return;
        setState({ status: "success", data, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError" || controller.signal.aborted) return;
        setState({ status: "error", data: null, error: err.message });
      });
    return () => controller.abort();
  }, [filters, attempt]);

  // Search, Clear and "Try again" switch to the loading state in the same
  // render that changes the filters. Doing it inside the effect would be too
  // late: effects run after the browser paints, so the previous results would
  // flash for a frame under the new filters (the other half of the debug
  // challenge).
  function search(nextFilters) {
    setState(LOADING);
    setFilters(nextFilters);
  }

  function retry() {
    setState(LOADING);
    setAttempt((n) => n + 1);
  }

  const { status, data, error } = state;
  const hasFilters = Object.keys(filters).length > 0;

  return (
    <main className="listings-page">
      <header className="listings-page__header">
        <h1>Property Listings</h1>
        {status === "success" && (
          <p className="listings-page__count">
            Showing {formatNumber(data.results.length)} of {formatNumber(data.total)}{" "}
            {hasFilters ? "matching properties" : "properties"}
          </p>
        )}
      </header>

      <PropertyFilters onSearch={search} onClear={() => search({})} />

      {status === "loading" && (
        <p className="listings-page__message" role="status">
          Loading properties…
        </p>
      )}

      {status === "error" && (
        <div className="listings-page__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {status === "success" && data.results.length === 0 && (
        <div className="listings-page__message">
          <p className="listings-page__empty-title">No properties found.</p>
          {hasFilters && (
            <p>Try a different city or ZIP code, widen the price range, or lower the beds and baths minimums.</p>
          )}
        </div>
      )}

      {status === "success" && data.results.length > 0 && (
        <section className="listings-page__grid" aria-label="Property results">
          {data.results.map((property) => (
            <PropertyCard key={property.L_ListingID} property={property} />
          ))}
        </section>
      )}
    </main>
  );
}
