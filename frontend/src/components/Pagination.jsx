import { ELLIPSIS, getPageNumbers } from "../utils/pagination";
import "./Pagination.css";

// Previous/next buttons and page numbers. It holds no state: the parent owns
// the current page and hears about changes through onPageChange.
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      {getPageNumbers(currentPage, totalPages).map((item, index) =>
        item === ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="pagination__ellipsis" aria-hidden="true">
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className="pagination__button"
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => {
              if (item !== currentPage) onPageChange(item);
            }}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
