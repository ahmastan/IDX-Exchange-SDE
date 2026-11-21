import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchOpenHouses, fetchPropertyDetail } from "../api/client";
import { formatEnumList, formatNumber, formatPrice, formatYesNo } from "../utils/format";
import { getCoordinates } from "../utils/map";
import PropertyImageGallery from "../components/PropertyImageGallery";
import PropertyMap from "../components/PropertyMap";
import OpenHouseList from "../components/OpenHouseList";
import "./PropertyDetailPage.css";

// The detail and the open houses load in parallel and fail independently: a
// broken open house request shouldn't hide the property itself.
export default function PropertyDetailPage() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(0);
  // Each result remembers which id and attempt it is for. Anything else counts
  // as loading, so moving to another property (or retrying) never shows the
  // previous result, without having to reset state inside the effect.
  const [detail, setDetail] = useState(null);
  const [openHouses, setOpenHouses] = useState(null);
  const requestKey = `${id}#${attempt}`;

  useEffect(() => {
    // Abort on cleanup so a slow response for a previous id can't land late
    const controller = new AbortController();
    const { signal } = controller;
    const settle = (setter) => [
      (data) => !signal.aborted && setter({ key: requestKey, data, error: null }),
      (err) => {
        if (err.name === "AbortError" || signal.aborted) return;
        setter({ key: requestKey, data: null, error: err });
      },
    ];
    fetchPropertyDetail(id, { signal }).then(...settle(setDetail));
    fetchOpenHouses(id, { signal }).then(...settle(setOpenHouses));
    return () => controller.abort();
  }, [id, requestKey]);

  const current = (result) => (result?.key === requestKey ? result : null);
  const detailResult = current(detail);
  const openHouseResult = current(openHouses);
  const property = detailResult?.data;

  useEffect(() => {
    if (!property) return;
    const previous = document.title;
    document.title = `${property.L_Address?.trim() || "Property"} | Property Search`;
    return () => {
      document.title = previous;
    };
  }, [property]);

  const retry = () => setAttempt((n) => n + 1);

  let content;
  if (!detailResult) {
    content = (
      <p className="detail-page__message" role="status">
        Loading property…
      </p>
    );
  } else if (detailResult.error) {
    // 400 = not a valid listing ID, 404 = no such listing. Same message for
    // both: either way there is nothing to show at this URL.
    const notFound = detailResult.error.status === 400 || detailResult.error.status === 404;
    content = (
      <div className="detail-page__error" role="alert">
        <h1>{notFound ? "Property not found" : "Something went wrong"}</h1>
        <p>
          {notFound
            ? "We couldn't find a property with that listing ID. It may have been removed, or the link may be wrong."
            : detailResult.error.message}
        </p>
        {notFound ? (
          <Link to="/">Browse all properties</Link>
        ) : (
          <button type="button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  } else {
    content = <PropertyDetail property={property} openHouseResult={openHouseResult} onRetry={retry} />;
  }

  return (
    <main className="detail-page">
      <BackLink />
      {content}
    </main>
  );
}

// Goes back in history when the user came from inside the app, so the
// browser's own Back and this link behave the same. Someone who opened the
// page directly (location.key is "default") has nothing to go back to in the
// app, so they get a link to the listings instead.
function BackLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasAppHistory = location.key !== "default";

  return (
    <Link
      to="/"
      className="detail-page__back"
      onClick={(event) => {
        if (!hasAppHistory) return;
        event.preventDefault();
        navigate(-1);
      }}
    >
      ← Back to listings
    </Link>
  );
}

function PropertyDetail({ property, openHouseResult, onRetry }) {
  const address = property.L_Address?.trim() || "Address not available";
  const cityState = [property.L_City?.trim(), property.L_State?.trim()].filter(Boolean).join(", ");
  const location = [cityState, property.L_Zip?.trim()].filter(Boolean).join(" ");
  const status = property.StandardStatus || property.L_Status;

  // RETS column names: L_Keyword2 = beds, LM_Dec_3 = baths, LM_Int2_3 = sqft
  const stats = [
    { label: "beds", value: formatNumber(property.L_Keyword2) },
    { label: "baths", value: formatNumber(property.LM_Dec_3) },
    { label: "sqft", value: formatNumber(property.LM_Int2_3) },
    { label: "year built", value: property.YearBuilt ? String(property.YearBuilt) : null },
  ];

  const remarks = property.L_Remarks?.trim();
  const details = getPropertyDetails(property);
  const listedBy = [property.ListAgentFullName?.trim(), property.LO1_OrganizationName?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="detail">
      <PropertyImageGallery photos={property.L_Photos} alt={`Photo of ${address}`} />

      <header className="detail__header">
        <div>
          <p className="detail__price">{formatPrice(property.L_SystemPrice) ?? "Price unavailable"}</p>
          <h1 className="detail__address">{address}</h1>
          {location && <p className="detail__location">{location}</p>}
        </div>
        {status && <span className="detail__status">{formatEnumList(status)}</span>}
      </header>

      <ul className="detail__stats" aria-label="Key facts">
        {stats.map(({ label, value }) => (
          <li key={label}>
            <strong>{value ?? "—"}</strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="detail__columns">
        <div className="detail__main">
          <section className="detail__section" aria-labelledby="detail-description">
            <h2 id="detail-description">Description</h2>
            {remarks ? (
              <p className="detail__remarks">{remarks}</p>
            ) : (
              <p className="detail__muted">No description provided.</p>
            )}
          </section>

          <section className="detail__section" aria-labelledby="detail-facts">
            <h2 id="detail-facts">Property details</h2>
            <dl className="detail__facts">
              {details.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="detail__side">
          <section className="detail__section" aria-labelledby="detail-open-houses">
            <h2 id="detail-open-houses">Open houses</h2>
            {!openHouseResult ? (
              <p className="detail__muted" role="status">
                Loading open houses…
              </p>
            ) : openHouseResult.error ? (
              <div className="detail__inline-error" role="alert">
                <p>Couldn't load open houses: {openHouseResult.error.message}</p>
                <button type="button" onClick={onRetry}>
                  Try again
                </button>
              </div>
            ) : (
              <OpenHouseList openHouses={openHouseResult.data} />
            )}
          </section>

          <section className="detail__section" aria-labelledby="detail-location">
            <h2 id="detail-location">Location</h2>
            <PropertyMap
              latitude={property.LMD_MP_Latitude}
              longitude={property.LMD_MP_Longitude}
              label={[address, location].filter(Boolean).join(", ")}
            />
            {!getCoordinates(property.LMD_MP_Latitude, property.LMD_MP_Longitude) && <p className="detail__muted">Map location not available.</p>}
          </section>

          {listedBy && <p className="detail__courtesy">Listing courtesy of {listedBy}</p>}
        </aside>
      </div>
    </article>
  );
}

// The "Property details" list: label/value pairs, skipping anything the
// listing doesn't have. Most of these are RESO fields stored as PascalCase
// enum lists ("CentralAir"), which formatEnumList makes readable.
function getPropertyDetails(p) {
  const acres = formatNumber(p.LotSizeAcres);
  const lotSqft = formatNumber(p.LotSizeSquareFeet);
  const lotSize = acres && Number(p.LotSizeAcres) > 0
    ? `${acres} ${Number(p.LotSizeAcres) === 1 ? "acre" : "acres"}${lotSqft ? ` (${lotSqft} sqft)` : ""}`
    : lotSqft && `${lotSqft} sqft`;

  const hoaFee = Number(p.AssociationFee) > 0
    ? [formatPrice(p.AssociationFee), formatEnumList(p.AssociationFeeFrequency)?.toLowerCase()]
        .filter(Boolean)
        .join(" / ")
    : null;

  const rows = [
    ["Property type", formatEnumList(p.L_Type_)],
    ["Lot size", lotSize],
    ["Stories", formatNumber(p.StoriesTotal)],
    ["Half baths", Number(p.BathroomsHalf) > 0 ? formatNumber(p.BathroomsHalf) : null],
    ["Garage", formatYesNo(p.GarageYN)],
    ["Pool", formatEnumList(p.PoolFeatures) ?? formatYesNo(p.PoolPrivateYN)],
    ["Heating", formatEnumList(p.Heating)],
    ["Cooling", formatEnumList(p.Cooling)],
    ["Fireplace", formatEnumList(p.FireplaceFeatures) ?? formatYesNo(p.FireplaceYN)],
    ["View", formatEnumList(p.View)],
    ["Flooring", formatEnumList(p.Flooring)],
    ["Interior features", formatEnumList(p.InteriorFeatures)],
    ["Community", formatEnumList(p.CommunityFeatures)],
    ["HOA fee", hoaFee],
    ["County", p.CountyOrParish?.trim()],
    ["Subdivision", p.SubdivisionName?.trim()],
    ["High school district", p.HighSchoolDistrict?.trim()],
    ["Days on market", formatNumber(p.DaysOnMarket)],
    ["MLS #", p.L_DisplayId || p.L_ListingID],
  ];
  return rows.filter(([, value]) => value).map(([label, value]) => ({ label, value: String(value) }));
}
