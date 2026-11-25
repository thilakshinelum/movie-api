// Central error handler. Express 5 also sends errors from rejected
// promises in async route handlers here. The four parameters tell
// Express that this is an error-handling middleware.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // Broken JSON in the request body is the client's mistake
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON" },
    });
  }

  // Log the details on the server, never send them to the client
  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred",
    },
  });
}
