import { Link } from "react-router-dom";
import { formatNumber, formatPrice } from "../utils/format";
import PropertyImageCarousel from "./PropertyImageCarousel";
import "./PropertyCard.css";

// RETS column names, for reference:
//   L_SystemPrice = price, L_Keyword2 = beds, LM_Dec_3 = baths, LM_Int2_3 = sqft
export default function PropertyCard({ property }) {
  const price = formatPrice(property.L_SystemPrice);
  const beds = formatNumber(property.L_Keyword2);
  const baths = formatNumber(property.LM_Dec_3);
  const sqft = formatNumber(property.LM_Int2_3);

  const address = property.L_Address?.trim() || "Address not available";
  const cityState = [property.L_City?.trim(), property.L_State?.trim()].filter(Boolean).join(", ");
  const location = [cityState, property.L_Zip?.trim()].filter(Boolean).join(" ");

  // The whole card is clickable through one real link (the address), stretched
  // over the card with CSS. A real <a> means middle-click, "open in new tab"
  // and keyboard Enter all work, and it avoids putting the carousel's buttons
  // inside an <a>, which is invalid HTML.
  return (
    <article className="property-card">
      <div className="property-card__media">
        <PropertyImageCarousel photos={property.L_Photos} alt={`Photo of ${address}`} />
      </div>

      <div className="property-card__body">
        <p className="property-card__price">{price ?? "Price unavailable"}</p>
        <ul className="property-card__stats">
          <li><strong>{beds ?? "—"}</strong> bd</li>
          <li><strong>{baths ?? "—"}</strong> ba</li>
          <li><strong>{sqft ?? "—"}</strong> sqft</li>
        </ul>
        <p className="property-card__address">
          <Link
            to={`/property/${encodeURIComponent(property.L_ListingID)}`}
            className="property-card__link"
          >
            {address}
          </Link>
        </p>
        {location && <p className="property-card__location">{location}</p>}
      </div>
    </article>
  );
}
