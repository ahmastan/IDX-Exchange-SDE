import { Link, Route, Routes } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";

// The router itself (BrowserRouter) lives in main.jsx so tests can render
// <App /> inside a MemoryRouter at any URL.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListingsPage />} />
      <Route path="/property/:id" element={<PropertyDetailPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
