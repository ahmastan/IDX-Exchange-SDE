# Frontend — IDX Property Search

React app (built with Vite) that shows property listings from the Express API.

## Running it

1. Start MySQL (`docker start idx-mysql-local`) and the backend (`cd ../backend && npm run dev`).
2. In this folder: `npm install`, then `npm run dev`.
3. Open http://localhost:3000.

Requests to `/api/*` are proxied to `http://localhost:5000` (see `vite.config.js`).
If the backend runs on another port, start the frontend with
`API_PROXY_TARGET=http://localhost:5001 npm run dev`.

## Google Maps

The property detail page embeds a map with the Google Maps Embed API. Copy
`.env.example` to `.env` and set `REACT_APP_GOOGLE_MAPS_API_KEY` (restrict the
key to `http://localhost:3000/*` and the Maps Embed API), then restart
`npm run dev`. `.env` is git-ignored. Without a key the page still shows a
"Get Directions" link. `vite.config.js` sets `envPrefix` so Vite exposes
`REACT_APP_*` variables the same way Create React App does.

## Routes

- `/`: listings (filters + pagination)
- `/property/:id`: property detail (photos, facts, open houses, map)

## Tests

`npm test` runs every test once with Vitest (Jest-compatible API) and React
Testing Library in a jsdom environment. `npm run test:watch` re-runs them as
files change. Tests sit next to the code they test (`*.test.js` / `*.test.jsx`)
and mock `fetch` or the API client, so they don't need the backend running.

## Layout

- `src/api/client.js` — every call to the API (`fetchProperties`, `fetchPropertyDetail`, `fetchOpenHouses`)
- `src/App.jsx`: React Router routes (the `BrowserRouter` is in `main.jsx`)
- `src/pages/PropertyDetailPage.jsx`: loads one property and its open houses, and handles not-found/error states
- `src/components/PropertyImageCarousel.jsx`: photo carousel on listing cards (arrows don't open the card)
- `src/components/PropertyImageGallery.jsx`: main photo, thumbnail strip, and full-screen lightbox
- `src/components/PropertyMap.jsx`: Google Maps Embed iframe + directions link
- `src/components/OpenHouseList.jsx`: open house dates, times, and remarks from `all_data`
- `src/utils/openHouses.js`: date/time formatting and `OpenHouseRemarks` parsing
- `src/utils/map.js`: validates latitude/longitude
- `src/pages/ListingsPage.jsx` — fetches listings for the current filters and page, and handles loading/error/empty states
- `src/components/PropertyFilters.jsx` — the filter form (city, ZIP, price range, beds, baths)
- `src/components/Pagination.jsx` — previous/next buttons and page numbers
- `src/components/PropertyCard.jsx` — one listing card
- `src/utils/filters.js` — trims/drops blank filter values and validates them
- `src/utils/pagination.js` — works out which page numbers and ellipses to show
- `src/utils/photos.js` — defensive parsing of `L_Photos`
- `src/utils/format.js` — price, number, RETS enum and yes/no formatting
