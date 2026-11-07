export const ELLIPSIS = "…";

// With this many pages or fewer, every page number gets shown
const MAX_WITHOUT_ELLIPSIS = 7;

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// The items to show in the pagination bar: page numbers and ELLIPSIS markers,
// e.g. page 5 of 24 gives [1, "…", 4, 5, 6, "…", 24].
//
// Each case below lists its own pages, so the first and last page are each
// added exactly once. Long lists always come to 7 items, so the bar keeps its
// width from page to page, and an ellipsis always hides at least two pages
// (hiding just one would take up the same space as showing it).
export function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= MAX_WITHOUT_ELLIPSIS) return range(1, totalPages);

  if (currentPage <= 4) return [...range(1, 5), ELLIPSIS, totalPages];

  if (currentPage >= totalPages - 3) return [1, ELLIPSIS, ...range(totalPages - 4, totalPages)];

  return [1, ELLIPSIS, currentPage - 1, currentPage, currentPage + 1, ELLIPSIS, totalPages];
}
