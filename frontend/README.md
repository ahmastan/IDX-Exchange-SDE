# Frontend — IDX Property Search

React app (built with Vite) that shows property listings from the Express API.

## Running it

1. Start MySQL (`docker start idx-mysql-local`) and the backend (`cd ../backend && npm run dev`).
2. In this folder: `npm install`, then `npm run dev`.
3. Open http://localhost:3000.

Requests to `/api/*` are proxied to `http://localhost:5000` (see `vite.config.js`).
If the backend runs on another port, start the frontend with
`API_PROXY_TARGET=http://localhost:5001 npm run dev`.

## Tests

`npm test` runs every test once with Vitest (Jest-compatible API) and React
Testing Library in a jsdom environment. `npm run test:watch` re-runs them as
files change. Tests sit next to the code they test (`*.test.js` / `*.test.jsx`)
and mock `fetch` or the API client, so they don't need the backend running.

## Layout

- `src/api/client.js` — every call to the API (`fetchProperties`, `fetchPropertyDetail`, `fetchOpenHouses`)
- `src/pages/ListingsPage.jsx` — fetches listings for the current filters and handles loading/error/empty states
- `src/components/PropertyFilters.jsx` — the filter form (city, ZIP, price range, beds, baths)
- `src/components/PropertyCard.jsx` — one listing card
- `src/utils/filters.js` — trims/drops blank filter values and validates them
- `src/utils/photos.js` — defensive parsing of `L_Photos`
- `src/utils/format.js` — price and number formatting
