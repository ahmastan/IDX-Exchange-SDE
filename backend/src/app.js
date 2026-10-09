const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Last-resort error handler so unexpected errors return 500 instead of crashing
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
