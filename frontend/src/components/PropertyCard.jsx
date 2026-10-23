import { useState } from "react";
import { getFirstPhoto } from "../utils/photos";
import { formatNumber, formatPrice } from "../utils/format";
import "./PropertyCard.css";

// RETS column names, for reference:
//   L_SystemPrice = price, L_Keyword2 = beds, LM_Dec_3 = baths, LM_Int2_3 = sqft
export default function PropertyCard({ property }) {
  const photo = getFirstPhoto(property.L_Photos);
  // A URL can be well-formed and still fail to load (expired or removed),
  // so fall back to the placeholder on load errors too.
  const [imageFailed, setImageFailed] = useState(false);

  const price = formatPrice(property.L_SystemPrice);
  const beds = formatNumber(property.L_Keyword2);
  const baths = formatNumber(property.LM_Dec_3);
  const sqft = formatNumber(property.LM_Int2_3);

  const address = property.L_Address?.trim() || "Address not available";
  const cityState = [property.L_City?.trim(), property.L_State?.trim()].filter(Boolean).join(", ");
  const location = [cityState, property.L_Zip?.trim()].filter(Boolean).join(" ");

  return (
    <article className="property-card">
      <div className="property-card__media">
        {photo && !imageFailed ? (
          <img
            src={photo}
            alt={`Photo of ${address}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="property-card__no-photo">No photo available</div>
        )}
      </div>

      <div className="property-card__body">
        <p className="property-card__price">{price ?? "Price unavailable"}</p>
        <ul className="property-card__stats">
          <li><strong>{beds ?? "—"}</strong> bd</li>
          <li><strong>{baths ?? "—"}</strong> ba</li>
          <li><strong>{sqft ?? "—"}</strong> sqft</li>
        </ul>
        <p className="property-card__address">{address}</p>
        {location && <p className="property-card__location">{location}</p>}
      </div>
    </article>
  );
}
