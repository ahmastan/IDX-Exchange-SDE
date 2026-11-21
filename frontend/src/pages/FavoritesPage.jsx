import { Link } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import PropertyCard from "../components/PropertyCard";
import "./ListingsPage.css";

// Saved properties, newest first. Cards come straight from the snapshots in
// useFavorites, so there is nothing to fetch, and unfavoriting a card removes
// it from this page on the same click.
export default function FavoritesPage() {
  const { favorites, count } = useFavorites();

  return (
    <main className="listings-page">
      <header className="listings-page__header">
        <h1>Favorites</h1>
        <p className="listings-page__count">
          {count === 0 ? "No saved properties yet" : `${count} saved ${count === 1 ? "property" : "properties"}`}
        </p>
      </header>

      {count === 0 ? (
        <div className="listings-page__message">
          <p className="listings-page__empty-title">Nothing saved yet.</p>
          <p>
            Tap the heart on any listing to save it here. <Link to="/">Browse listings</Link>
          </p>
        </div>
      ) : (
        <section className="listings-page__grid" aria-label="Favorite properties">
          {favorites.map((property) => (
            <PropertyCard key={property.L_ListingID} property={property} />
          ))}
        </section>
      )}
    </main>
  );
}
