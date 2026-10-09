const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/health — confirms the API is up and can reach MySQL.
router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check failed:", err.code || err.message);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: "Unable to reach the database",
    });
  }
});

module.exports = router;
