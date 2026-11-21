import { useFavorites } from "../hooks/useFavorites";
import "./FavoriteButton.css";

// Heart toggle for saving a property. On a PropertyCard it sits on top of the
// card's full-card link, so the click must not also open the detail page.
export default function FavoriteButton({ property, className = "" }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(property.L_ListingID);
  const address = property.L_Address?.trim() || "this property";

  function handleClick(event) {
    // preventDefault stops a surrounding link from following its href, and
    // stopPropagation keeps the click from reaching parent click handlers
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(property);
  }

  return (
    <button
      type="button"
      className={`favorite-button${saved ? " favorite-button--saved" : ""} ${className}`.trim()}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${address} from favorites` : `Save ${address} to favorites`}
      title={saved ? "Remove from favorites" : "Save to favorites"}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          d="M12 20.5s-7.5-4.6-9.6-9.2C1 8.2 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 3.7 0 5.6 3.7 4.2 6.8-2.1 4.6-9.6 9.2-9.6 9.2z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
