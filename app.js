// Movie REST API - Backend Development, Week 2
const express = require("express");
const morgan = require("morgan");

const app = express();
const PORT = 3000;

// ---------- Middleware (runs before the routes) ----------

// Parses JSON request bodies into req.body
app.use(express.json());

// My own simple logger (Task 4.2). It was used for testing first and
// is now disabled so that requests are not logged twice with Morgan.
function simpleLogger(req, res, next) {
  console.log(req.method, req.originalUrl);
  next();
}
// app.use(simpleLogger);

// Morgan request logger: method, URL, status code and response time
app.use(morgan("dev"));

// ---------- Data (in memory) ----------

let movies = [
  { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi" },
  { id: 2, title: "The Matrix", year: 1999, genre: "Sci-Fi" },
  { id: 3, title: "Parasite", year: 2019, genre: "Thriller" },
];

let nextId = 4; // the server creates the ids

// ---------- Helper functions ----------

// Returns a list of validation errors (empty list = valid).
// partial = true is used for PATCH, where fields are optional.
function validateMovie(body, partial = false) {
  const errors = [];
  const maximumYear = new Date().getFullYear() + 5;

  if (!partial && body.title === undefined) {
    errors.push("title is required");
  }
  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim().length === 0)
  ) {
    errors.push("title must be a non-empty string");
  }

  if (!partial && body.year === undefined) {
    errors.push("year is required");
  }
  if (
    body.year !== undefined &&
    (!Number.isInteger(body.year) ||
      body.year < 1888 ||
      body.year > maximumYear)
  ) {
    errors.push("year must be a valid integer");
  }

  if (!partial && body.genre === undefined) {
    errors.push("genre is required");
  }
  if (
    body.genre !== undefined &&
    (typeof body.genre !== "string" || body.genre.trim().length === 0)
  ) {
    errors.push("genre must be a non-empty string");
  }

  return errors;
}

// Consistent error responses
function sendValidationError(res, details) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Movie data is invalid",
      details,
    },
  });
}

function sendMovieNotFound(res) {
  return res.status(404).json({
    error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
  });
}

function sendInvalidQuery(res, message) {
  return res.status(400).json({
    error: { code: "INVALID_QUERY_PARAMETER", message },
  });
}

function findMovie(idParam) {
  return movies.find((m) => m.id === Number(idParam));
}

// ---------- Routes ----------

// GET /movies  (optional: ?genre=Sci-Fi&minYear=2000&sort=year|title)
app.get("/movies", (req, res) => {
  const { genre, minYear, sort } = req.query;

  // A repeated parameter (?genre=a&genre=b) arrives as an array -> reject it
  for (const [name, value] of Object.entries({ genre, minYear, sort })) {
    if (value !== undefined && typeof value !== "string") {
      return sendInvalidQuery(res, `${name} must be given only once`);
    }
  }

  // Work on a copy so the original array is never changed
  let result = [...movies];

  if (genre !== undefined) {
    result = result.filter(
      (m) => m.genre.toLowerCase() === genre.toLowerCase()
    );
  }

  if (minYear !== undefined) {
    const min = Number(minYear);
    if (minYear.trim() === "" || !Number.isInteger(min)) {
      return sendInvalidQuery(res, "minYear must be an integer");
    }
    result = result.filter((m) => m.year >= min);
  }

  if (sort !== undefined) {
    if (sort === "year") {
      result.sort((a, b) => a.year - b.year);
    } else if (sort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      return sendInvalidQuery(res, "sort must be 'year' or 'title'");
    }
  }

  res.status(200).json(result);
});

// GET /movies/:id
app.get("/movies/:id", (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) return sendMovieNotFound(res);
  res.status(200).json(movie);
});

// POST /movies -> create (all fields required)
app.post("/movies", (req, res) => {
  const body = req.body || {};
  const errors = validateMovie(body, false);
  if (errors.length > 0) return sendValidationError(res, errors);

  const newMovie = {
    id: nextId++,
    title: body.title.trim(),
    year: body.year,
    genre: body.genre.trim(),
  };
  movies.push(newMovie);
  res.status(201).json(newMovie);
});

// PUT /movies/:id -> replace the whole movie (all fields required)
app.put("/movies/:id", (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) return sendMovieNotFound(res);

  const body = req.body || {};
  const errors = validateMovie(body, false);
  if (errors.length > 0) return sendValidationError(res, errors);

  // Replace all editable fields, keep the id
  movie.title = body.title.trim();
  movie.year = body.year;
  movie.genre = body.genre.trim();

  res.status(200).json(movie);
});

// PATCH /movies/:id -> change only the fields that are sent
app.patch("/movies/:id", (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) return sendMovieNotFound(res);

  const body = req.body || {};
  const errors = validateMovie(body, true);
  if (errors.length > 0) return sendValidationError(res, errors);

  // Check for undefined, not truthy/falsy
  if (body.title !== undefined) movie.title = body.title.trim();
  if (body.year !== undefined) movie.year = body.year;
  if (body.genre !== undefined) movie.genre = body.genre.trim();

  res.status(200).json(movie);
});

// DELETE /movies/:id -> 204 No Content (no body)
app.delete("/movies/:id", (req, res) => {
  const index = movies.findIndex((m) => m.id === Number(req.params.id));
  if (index === -1) return sendMovieNotFound(res);

  movies.splice(index, 1);
  res.status(204).send();
});

// ---------- Middleware after the routes ----------

// Unknown routes -> JSON 404
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested route does not exist",
    },
  });
});

// Error handler (4 parameters) -> must be registered last
app.use((err, req, res, next) => {
  // Broken JSON in the request body is the client's mistake -> 400
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON" },
    });
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
