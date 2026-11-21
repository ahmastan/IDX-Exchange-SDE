import { getCoordinates } from "../utils/map";
import "./PropertyMap.css";

// Google Maps Embed API (an iframe, no npm package). The key is read when the
// component renders, from frontend/.env, so tests can stub it.
export default function PropertyMap({ latitude, longitude, label, apiKey }) {
  const coords = getCoordinates(latitude, longitude);
  if (!coords) return null;

  const key = apiKey ?? import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const q = `${coords.lat},${coords.lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;

  return (
    <div className="property-map">
      {key ? (
        <iframe
          className="property-map__frame"
          title={label ? `Map of ${label}` : "Property location map"}
          src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&zoom=15`}
          loading="lazy"
          allowFullScreen
          // Google checks the referrer against the key's website restriction
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <p className="property-map__missing-key">
          Map unavailable: add REACT_APP_GOOGLE_MAPS_API_KEY to frontend/.env and restart the dev server.
        </p>
      )}
      <a className="property-map__directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">
        Get Directions ↗
      </a>
    </div>
  );
}
