import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import { formatNumber } from "../utils/format";
import PropertyCard from "../components/PropertyCard";
import "./ListingsPage.css";

const PAGE_SIZE = 20;

export default function ListingsPage() {
  // status is "loading", "error", or "success"
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  // Bumping this re-runs the effect, which is how "Try again" refetches
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Aborting on cleanup stops a stale response from overwriting newer state
    // (and covers StrictMode running effects twice in development).
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    fetchProperties({ limit: PAGE_SIZE, offset: 0 }, { signal: controller.signal })
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", data: null, error: err.message });
      });

    return () => controller.abort();
  }, [attempt]);

  const { status, data, error } = state;

  return (
    <main className="listings-page">
      <header className="listings-page__header">
        <h1>Property Listings</h1>
        {status === "success" && (
          <p className="listings-page__count">
            Showing {formatNumber(data.results.length)} of {formatNumber(data.total)} properties
          </p>
        )}
      </header>

      {status === "loading" && (
        <p className="listings-page__message" role="status">
          Loading properties…
        </p>
      )}

      {status === "error" && (
        <div className="listings-page__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {status === "success" && data.results.length === 0 && (
        <p className="listings-page__message">No properties found.</p>
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
