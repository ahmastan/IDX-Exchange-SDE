# Frontend — IDX Property Search

React app (built with Vite) that shows property listings from the Express API.

## Running it

1. Start MySQL (`docker start idx-mysql-local`) and the backend (`cd ../backend && npm run dev`).
2. In this folder: `npm install`, then `npm run dev`.
3. Open http://localhost:3000.

Requests to `/api/*` are proxied to `http://localhost:5000` (see `vite.config.js`).
If the backend runs on another port, start the frontend with
`API_PROXY_TARGET=http://localhost:5001 npm run dev`.

## Layout

- `src/api/client.js` — every call to the API (`fetchProperties`, `fetchPropertyDetail`, `fetchOpenHouses`)
- `src/pages/ListingsPage.jsx` — fetches the first page and handles loading/error states
- `src/components/PropertyCard.jsx` — one listing card
- `src/utils/photos.js` — defensive parsing of `L_Photos`
- `src/utils/format.js` — price and number formatting
