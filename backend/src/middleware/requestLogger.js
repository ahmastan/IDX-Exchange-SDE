// Logs one line per request once the response is done:
//   2026-10-16T15:04:05.123Z GET /api/properties?city=Irvine 200 12.3ms
// The timestamp is when the request arrived. "close" fires for finished and
// aborted requests alike, so a client hanging up early still gets logged.
function requestLogger({ log = console.log } = {}) {
  return (req, res, next) => {
    const startedAt = new Date().toISOString();
    const start = process.hrtime.bigint();

    res.once("close", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.writableFinished ? res.statusCode : `${res.statusCode} (aborted)`;
      log(`${startedAt} ${req.method} ${req.originalUrl} ${status} ${ms.toFixed(1)}ms`);
    });

    next();
  };
}

module.exports = requestLogger;
