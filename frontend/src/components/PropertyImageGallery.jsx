import { useEffect, useRef, useState } from "react";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageGallery.css";

// Photo gallery for the detail page: a large main photo, a scrollable strip of
// thumbnails, and a full-screen lightbox when the main photo is clicked.
export default function PropertyImageGallery({ photos, alt }) {
  const urls = parsePhotos(photos);
  const [failed, setFailed] = useState(() => new Set());
  const usable = urls.filter((url) => !failed.has(url));
  const count = usable.length;

  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const current = count ? Math.min(index, count - 1) : 0;

  const mainButtonRef = useRef(null);
  const stripRef = useRef(null);
  const thumbRefs = useRef([]);

  // Keep the selected thumbnail visible as the photo changes (arrows, or the
  // arrow keys inside the lightbox). This scrolls only the strip sideways;
  // scrollIntoView() would also scroll the whole page to reach it.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = thumbRefs.current[current];
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft;
    const right = left + thumb.offsetWidth;
    if (left < strip.scrollLeft) {
      strip.scrollLeft = left;
    } else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = right - strip.clientWidth;
    }
  }, [current]);

  if (count === 0) {
    return <div className="gallery gallery--empty">No photos available</div>;
  }

  function step(delta) {
    setIndex((current + delta + count) % count);
  }

  function handleError(url) {
    setFailed((prev) => new Set(prev).add(url));
  }

  function closeLightbox() {
    setLightboxOpen(false);
    // Put focus back where it was before the lightbox opened
    mainButtonRef.current?.focus();
  }

  const url = usable[current];
  const photoAlt = (i) => (count > 1 ? `${alt} (photo ${i + 1} of ${count})` : alt);

  return (
    <div className="gallery">
      <div className="gallery__main">
        <button
          type="button"
          ref={mainButtonRef}
          className="gallery__main-button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open full-screen photo viewer"
        >
          <img key={url} src={url} alt={photoAlt(current)} onError={() => handleError(url)} />
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              className="gallery__arrow gallery__arrow--prev"
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery__arrow gallery__arrow--next"
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              ›
            </button>
            <span className="gallery__counter">
              {current + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul ref={stripRef} className="gallery__thumbs" aria-label="Photo thumbnails">
          {usable.map((thumbUrl, i) => (
            <li key={thumbUrl}>
              <button
                type="button"
                ref={(el) => (thumbRefs.current[i] = el)}
                className={`gallery__thumb${i === current ? " gallery__thumb--active" : ""}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                onClick={() => setIndex(i)}
              >
                <img src={thumbUrl} alt="" loading="lazy" onError={() => handleError(thumbUrl)} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxOpen && (
        <Lightbox
          url={url}
          alt={photoAlt(current)}
          position={count > 1 ? `${current + 1} / ${count}` : null}
          onPrev={count > 1 ? () => step(-1) : null}
          onNext={count > 1 ? () => step(1) : null}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}

function Lightbox({ url, alt, position, onPrev, onNext, onClose }) {
  const dialogRef = useRef(null);

  // Debug challenge: a keydown handler on a plain <div> never fires, because
  // keyboard events go to the focused element and a div can't take focus.
  // tabIndex={-1} makes it focusable (from script, without adding it to the
  // Tab order), and focusing it on open is what routes key presses here.
  useEffect(() => {
    dialogRef.current?.focus();
    // Stop the page behind the lightbox from scrolling
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowLeft" && onPrev) {
      event.preventDefault();
      onPrev();
    } else if (event.key === "ArrowRight" && onNext) {
      event.preventDefault();
      onNext();
    }
  }

  // Only a click on the dark backdrop itself closes; clicks on the photo or
  // the buttons land on those elements, not the backdrop
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <button type="button" className="lightbox__close" aria-label="Close photo viewer" onClick={onClose}>
        ×
      </button>
      {onPrev && (
        <button type="button" className="lightbox__arrow lightbox__arrow--prev" aria-label="Previous photo" onClick={onPrev}>
          ‹
        </button>
      )}
      <img className="lightbox__image" src={url} alt={alt} />
      {onNext && (
        <button type="button" className="lightbox__arrow lightbox__arrow--next" aria-label="Next photo" onClick={onNext}>
          ›
        </button>
      )}
      {position && <span className="lightbox__counter">{position}</span>}
    </div>
  );
}
