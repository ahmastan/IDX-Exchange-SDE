import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import { formatNumber } from "../utils/format";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import Pagination from "../components/Pagination";
import SortSelect from "../components/SortSelect";
import { DEFAULT_SORT, toSortParams } from "../utils/sort";
import "./ListingsPage.css";

const DEFAULT_ITEMS_PER_PAGE = 20;
const LOADING = { status: "loading", data: null, error: null };

export default function ListingsPage() {
  // status is "loading", "error", or "success"
  const [state, setState] = useState(LOADING);
  // The filters from the last Search, already cleaned by PropertyFilters.
  // Search and Clear always set a new object, so the effect below re-runs even
  // when the values are the same as before.
  const [filters, setFilters] = useState({});
  // One of the SORT_OPTIONS values, e.g. "L_SystemPrice:asc". It lives here,
  // next to the filters and page, because all three decide what to fetch.
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  // Bumping this re-runs the effect, which is how "Try again" refetches
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Only the request for the current filters and page may update the page.
    // When either changes, cleanup aborts the previous request, so a slow older
    // response can't land after a newer one and replace the right results
    // (part of the Week 6 debug challenge). This also covers StrictMode
    // running effects twice in development.
    const controller = new AbortController();
    const offset = (currentPage - 1) * itemsPerPage;
    fetchProperties(
      { ...filters, ...toSortParams(sort), limit: itemsPerPage, offset },
      { signal: controller.signal }
    )
      .then((data) => {
        // Belt and braces: never apply a response for a cancelled request
        if (controller.signal.aborted) return;
        // Listings were removed and this page no longer exists: stay in the
        // loading state and fetch the new last page instead of showing nothing
        if (data.total > 0 && offset >= data.total) {
          setCurrentPage(Math.ceil(data.total / itemsPerPage));
          return;
        }
        setState({ status: "success", data, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError" || controller.signal.aborted) return;
        setState({ status: "error", data: null, error: err.message });
      });
    return () => controller.abort();
  }, [filters, sort, currentPage, itemsPerPage, attempt]);

  // Every handler below switches to the loading state in the same render that
  // changes what to fetch. Doing it inside the effect would be too late: effects
  // run after the browser paints, so the previous results would flash for a
  // frame under the new filters (the other half of the debug challenge).

  // New filters mean a new result set, so start again from page 1 in the
  // default order
  function search(nextFilters) {
    setState(LOADING);
    setFilters(nextFilters);
    setSort(DEFAULT_SORT);
    setCurrentPage(1);
  }

  // A new order changes what page 1 holds, so go back to it. Filters stay.
  function changeSort(nextSort) {
    setState(LOADING);
    setSort(nextSort);
    setCurrentPage(1);
  }

  // Filters and sort aren't touched here, so the new page keeps both
  function goToPage(page) {
    setState(LOADING);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }

  function retry() {
    setState(LOADING);
    setAttempt((n) => n + 1);
  }

  const { status, data, error } = state;
  const hasFilters = Object.keys(filters).length > 0;
  const hasResults = status === "success" && data.results.length > 0;

  return (
    <main className="listings-page">
      <header className="listings-page__header">
        <h1>Property Listings</h1>
      </header>

      <PropertyFilters onSearch={search} onClear={() => search({})} />

      <div className="listings-page__toolbar">
        <p className="listings-page__count">
          {hasResults && (
            <>
              Showing {formatNumber(data.offset + 1)}-{formatNumber(data.offset + data.results.length)} of{" "}
              {formatNumber(data.total)} {data.total === 1 ? "property" : "properties"}
            </>
          )}
        </p>
        <SortSelect value={sort} onChange={changeSort} />
      </div>

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

      {hasResults && (
        <>
          <section className="listings-page__grid" aria-label="Property results">
            {data.results.map((property) => (
              <PropertyCard key={property.L_ListingID} property={property} />
            ))}
          </section>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(data.total / itemsPerPage)}
            onPageChange={goToPage}
          />
        </>
      )}
    </main>
  );
}
