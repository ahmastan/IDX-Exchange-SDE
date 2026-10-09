// Load .env before anything reads process.env
require("dotenv").config({ quiet: true });

const app = require("./app");

const PORT = process.env.PORT || 5000;

// Express 5 passes listen errors (e.g. port already in use) to this callback
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start server on port ${PORT}: ${err.message}`);
    if (err.code === "EADDRINUSE" && String(PORT) === "5000") {
      console.error(
        "On macOS, port 5000 is used by AirPlay Receiver. Turn it off in " +
          "System Settings > General > AirDrop & Handoff."
      );
    }
    process.exit(1);
  }
  console.log(`Server listening on http://localhost:${PORT}`);
});
