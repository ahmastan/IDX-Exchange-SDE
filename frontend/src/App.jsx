import { Link, Route, Routes, useLocation } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import OpenHouseCalendarPage from "./pages/OpenHouseCalendarPage";
import SiteHeader from "./components/SiteHeader";
import ErrorBoundary from "./components/ErrorBoundary";

// The router itself (BrowserRouter) lives in main.jsx so tests can render
// <App /> inside a MemoryRouter at any URL.
export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <SiteHeader />
      {/* A crash in one page shows the recovery screen; moving to another
          path clears it */}
      <ErrorBoundary resetKey={pathname}>
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/open-houses" element={<OpenHouseCalendarPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to listings</Link>
      </p>
    </main>
  );
}
