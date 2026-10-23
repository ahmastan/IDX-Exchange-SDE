// Every call to the Express API goes through this module, so components never
// build URLs or inspect HTTP responses themselves. Requests use relative
// /api/* paths, which the Vite dev server proxies to Express.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status; // undefined when the request never got a response
  }
}

const UNREACHABLE_MESSAGE =
  "Could not reach the property server. Make sure the backend is running and try again.";

// Builds "?a=1&b=2", skipping params that are undefined, null, or blank so an
// empty filter field doesn't get sent (and rejected) as "city=".
function toQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    search.append(key, String(value).trim());
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    // Let callers tell a cancelled request apart from a real failure
    if (err.name === "AbortError") throw err;
    throw new ApiError(UNREACHABLE_MESSAGE);
  }

  // Read the body once as text so a non-JSON body (e.g. the dev proxy's empty
  // 500 when Express is down) can't throw a confusing SyntaxError.
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    if (body && typeof body.error === "string") {
      throw new ApiError(body.error, response.status);
    }
    // No JSON error from Express means the request didn't make it there
    if (response.status >= 500) throw new ApiError(UNREACHABLE_MESSAGE, response.status);
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  if (body === null) {
    throw new ApiError("The server sent a response that could not be read.", response.status);
  }
  return body;
}

// GET /api/properties: resolves to { total, limit, offset, results }.
// params: city, zipcode, minPrice, maxPrice, beds, baths, limit, offset
export function fetchProperties(params, options) {
  return request(`/api/properties${toQueryString(params)}`, options);
}

// GET /api/properties/:id: resolves to one property with every column
export function fetchPropertyDetail(id, options) {
  return request(`/api/properties/${encodeURIComponent(id)}`, options);
}

// GET /api/properties/:id/openhouses: resolves to an array, soonest first
export function fetchOpenHouses(id, options) {
  return request(`/api/properties/${encodeURIComponent(id)}/openhouses`, options);
}
