const express = require("express");
const { parseDateRange } = require("../validation/dateRange");
const { getOpenHousesInRange } = require("../queries/openHouseCalendar");

const router = express.Router();

// GET /api/openhouses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Open houses across all listings in an inclusive date range of up to 366
// days, soonest first. A range with no open houses is a 200 with [].
router.get("/", async (req, res) => {
  const { value, errors } = parseDateRange(req.query);
  if (errors) {
    return res.status(400).json({ error: errors.join("; "), details: errors });
  }

  res.json(await getOpenHousesInRange(value));
});

module.exports = router;
