import { useState } from "react";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageCarousel.css";

// Photo carousel for a listing card: one photo at a time, prev/next arrows and
// an "X / Y" counter. `photos` is L_Photos in whatever shape it arrives (array,
// JSON string, null); parsePhotos turns it into a clean list of URLs.
export default function PropertyImageCarousel({ photos, alt }) {
  const urls = parsePhotos(photos);
  const [index, setIndex] = useState(0);
  // URLs that failed to load (expired or removed photos), skipped from then on
  const [failed, setFailed] = useState(() => new Set());

  const usable = urls.filter((url) => !failed.has(url));
  const count = usable.length;
  // Clamp in case a photo failed and the list got shorter
  const current = count ? Math.min(index, count - 1) : 0;

  if (count === 0) {
    return <div className="carousel carousel--empty">No photo available</div>;
  }

  // The carousel sits on a card that links to the detail page. The arrows must
  // only change the photo: stopPropagation keeps the click from reaching the
  // card, and preventDefault stops any surrounding link from navigating.
  function step(event, delta) {
    event.preventDefault();
    event.stopPropagation();
    // Wraps around: next on the last photo goes back to the first
    setIndex((current + delta + count) % count);
  }

  function handleError(url) {
    setFailed((prev) => new Set(prev).add(url));
  }

  const url = usable[current];

  return (
    <div className="carousel">
      <img
        key={url}
        src={url}
        alt={count > 1 ? `${alt} (photo ${current + 1} of ${count})` : alt}
        loading="lazy"
        onError={() => handleError(url)}
      />
      {count > 1 && (
        <>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="Previous photo"
            onClick={(event) => step(event, -1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="Next photo"
            onClick={(event) => step(event, 1)}
          >
            ›
          </button>
          <span className="carousel__counter" aria-live="polite">
            {current + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
