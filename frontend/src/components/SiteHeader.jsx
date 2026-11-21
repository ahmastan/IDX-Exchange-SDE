import { NavLink } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import "./SiteHeader.css";

// Top navigation shown on every page. It sits outside the error boundary, so
// even if a page crashes the user can still navigate away.
export default function SiteHeader() {
  const { count } = useFavorites();

  return (
    <header className="site-header">
      <nav className="site-header__nav" aria-label="Main">
        <NavLink to="/" end className="site-header__brand">
          IDX Homes
        </NavLink>
        <div className="site-header__links">
          <NavLink to="/" end className="site-header__link">
            Listings
          </NavLink>
          <NavLink to="/open-houses" className="site-header__link">
            Open houses
          </NavLink>
          <NavLink to="/favorites" className="site-header__link">
            Favorites{" "}
            <span className="site-header__count" aria-label={`(${count} saved)`}>
              {count}
            </span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
