const express = require("express");
const { parsePropertyQuery } = require("../validation/propertyQuery");
const { parseListingId } = require("../validation/listingId");
const { searchProperties } = require("../queries/propertySearch");
const {
  getPropertyById,
  propertyExists,
  getOpenHousesByListingId,
} = require("../queries/propertyDetail");

const router = express.Router();

// Express 5 forwards rejected promises from these handlers to the error
// handler in app.js, so a database failure becomes a 500 instead of an
// unhandled rejection.

// GET /api/properties — paginated, filterable property search.
// Query params: city, zipcode, minPrice, maxPrice, beds, baths, limit, offset
router.get("/", async (req, res) => {
  const { value, errors } = parsePropertyQuery(req.query);
  if (errors) {
    return res.status(400).json({ error: errors.join("; "), details: errors });
  }

  res.json(await searchProperties(value));
});

// GET /api/properties/:id/openhouses — open houses for one listing, soonest
// first. Registered before /:id: Express tries routes in order, so the more
// specific path must come first or the generic one could claim the request.
router.get("/:id/openhouses", async (req, res) => {
  const { value: id, error } = parseListingId(req.params.id);
  if (error) return res.status(400).json({ error });

  // Checked first so an unknown listing is a 404, while a real listing with
  // no open houses is a 200 with []
  if (!(await propertyExists(id))) {
    return res.status(404).json({ error: `No property found with listing ID ${id}` });
  }

  res.json(await getOpenHousesByListingId(id));
});

// GET /api/properties/:id — one property with every column
router.get("/:id", async (req, res) => {
  const { value: id, error } = parseListingId(req.params.id);
  if (error) return res.status(400).json({ error });

  const property = await getPropertyById(id);
  if (!property) {
    return res.status(404).json({ error: `No property found with listing ID ${id}` });
  }

  res.json(property);
});

module.exports = router;
