// Checks that :id is a positive integer before the Controller runs.
const MAX_INTEGER = 2147483647; // largest PostgreSQL INTEGER

export default function validateMovieId(req, res, next) {
  const { id } = req.params;
  const movieId = Number(id);

  if (!/^\d+$/.test(id) || movieId < 1 || movieId > MAX_INTEGER) {
    return res.status(400).json({
      error: { code: "INVALID_ID", message: "id must be a positive integer" },
    });
  }

  // Make the numeric id available to the next functions
  res.locals.movieId = movieId;
  next();
}
