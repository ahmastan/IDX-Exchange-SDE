const express = require("express");
const cors = require("cors");
const requestLogger = require("./middleware/requestLogger");
const healthRouter = require("./routes/health");
const propertiesRouter = require("./routes/properties");

const app = express();

// First, so the logged time covers every other middleware. Off under Jest
// (which sets NODE_ENV=test) to keep test output readable.
if (process.env.NODE_ENV !== "test") app.use(requestLogger());

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/properties", propertiesRouter);

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
