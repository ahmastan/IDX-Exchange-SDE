import { useCallback, useMemo, useSyncExternalStore } from "react";

// Saved properties, kept in localStorage so they survive a page refresh.
//
// Every component that calls useFavorites() (each card's heart, the header
// count, the Favorites page) reads one shared store. Separate useState copies
// would drift apart: saving a property from a card wouldn't update the count
// in the header. useSyncExternalStore re-renders every subscriber whenever
// the store changes, with no context provider needed.
//
// Each favorite is a snapshot of the fields a PropertyCard shows, not just an
// ID. That way the Favorites page can render without another API request, and
// unfavoriting removes a card immediately.

export const STORAGE_KEY = "idx-favorites";

// The fields a PropertyCard needs. Photos are capped so a few hundred saved
// listings stay far below the ~5 MB localStorage quota.
const SNAPSHOT_FIELDS = [
  "L_ListingID",
  "L_Address",
  "L_City",
  "L_State",
  "L_Zip",
  "L_SystemPrice",
  "L_Keyword2",
  "LM_Dec_3",
  "LM_Int2_3",
];
const MAX_PHOTOS = 10;

const EMPTY = Object.freeze([]);
const listeners = new Set();

// If localStorage throws (private mode, blocked site data, quota full),
// favorites still work for this visit from memory; they just won't persist.
let memoryRaw = null;
let storageWorks = true;

function readRaw() {
  if (storageWorks) {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      storageWorks = false;
    }
  }
  return memoryRaw;
}

function writeRaw(raw) {
  memoryRaw = raw;
  if (!storageWorks) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    storageWorks = false;
  }
}

// Anything that isn't an array of objects with a listing ID (hand-edited,
// corrupted, or from an older format) is ignored rather than crashing the app.
function parse(raw) {
  if (!raw) return EMPTY;
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return EMPTY;
    return list.filter((item) => item && typeof item === "object" && item.L_ListingID != null);
  } catch {
    return EMPTY;
  }
}

// useSyncExternalStore calls this on every render and compares results with
// Object.is, so it must return the same array until the data really changes.
// Caching on the raw string does that, and it also picks up changes made
// directly to localStorage (such as tests clearing it).
let cachedRaw;
let cachedList = EMPTY;

function getSnapshot() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function getServerSnapshot() {
  return EMPTY;
}

function setFavorites(next) {
  writeRaw(JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

// The "storage" event fires when another tab changes localStorage, so
// favorites saved in one tab show up in the others.
function handleStorage(event) {
  if (event.key === STORAGE_KEY || event.key === null) {
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

const idOf = (property) => String(property.L_ListingID);

export function toSnapshot(property) {
  const snapshot = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (property[field] !== undefined) snapshot[field] = property[field];
  }
  snapshot.L_ListingID = idOf(property);
  snapshot.L_Photos = Array.isArray(property.L_Photos) ? property.L_Photos.slice(0, MAX_PHOTOS) : [];
  return snapshot;
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ids = useMemo(() => new Set(favorites.map(idOf)), [favorites]);

  const isFavorite = useCallback((listingId) => ids.has(String(listingId)), [ids]);

  // Each change re-reads the store rather than using `favorites` from this
  // render, so two quick clicks can't overwrite each other.
  const addFavorite = useCallback((property) => {
    const current = getSnapshot();
    if (current.some((item) => idOf(item) === idOf(property))) return;
    // Newest first
    setFavorites([toSnapshot(property), ...current]);
  }, []);

  const removeFavorite = useCallback((listingId) => {
    const current = getSnapshot();
    const next = current.filter((item) => idOf(item) !== String(listingId));
    if (next.length !== current.length) setFavorites(next);
  }, []);

  const toggleFavorite = useCallback(
    (property) => {
      if (getSnapshot().some((item) => idOf(item) === idOf(property))) removeFavorite(property.L_ListingID);
      else addFavorite(property);
    },
    [addFavorite, removeFavorite]
  );

  return { favorites, count: favorites.length, isFavorite, addFavorite, removeFavorite, toggleFavorite };
}
