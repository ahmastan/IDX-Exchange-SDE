const express = require("express");
const { parsePropertyQuery } = require("../validation/propertyQuery");
const { searchProperties } = require("../queries/propertySearch");

const router = express.Router();

// GET /api/properties — paginated, filterable property search.
// Query params: city, zipcode, minPrice, maxPrice, beds, baths, limit, offset
router.get("/", async (req, res) => {
  const { value, errors } = parsePropertyQuery(req.query);
  if (errors) {
    return res.status(400).json({ error: errors.join("; "), details: errors });
  }

  // Express 5 forwards rejected promises to the error handler in app.js (500)
  res.json(await searchProperties(value));
});

module.exports = router;
