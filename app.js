// Movie REST API - Backend Development, Week 4 (Express + PostgreSQL)

// Load .env first: db.js reads process.env when the Pool is created
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ---------- Middleware ----------
app.use(express.json());
app.use(morgan("dev"));

// ---------- Helpers ----------

// Columns returned to the client. release_year is renamed to year so the
// JSON stays the same as before (the REST API contract does not change).
const MOVIE_COLUMNS = "id, title, director, release_year AS year";

// Validation rules (same idea as Week 2). partial = true for PATCH.
function validateMovie(body, partial = false) {
  const errors = [];
  const maximumYear = new Date().getFullYear() + 5;

  for (const field of ["title", "director"]) {
    if (!partial && body[field] === undefined) {
      errors.push(`${field} is required`);
    }
    if (
      body[field] !== undefined &&
      (typeof body[field] !== "string" || body[field].trim().length === 0)
    ) {
      errors.push(`${field} must be a non-empty string`);
    } else if (typeof body[field] === "string" && body[field].length > 200) {
      errors.push(`${field} must be at most 200 characters`);
    }
  }

  if (!partial && body.year === undefined) {
    errors.push("year is required");
  }
  if (
    body.year !== undefined &&
    (!Number.isInteger(body.year) || body.year < 1888 || body.year > maximumYear)
  ) {
    errors.push("year must be a valid integer");
  }

  return errors;
}

// Returns the id as a number, or null if it is not a valid positive integer
function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  // PostgreSQL INTEGER maximum value
  if (id < 1 || id > 2147483647) return null;
  return id;
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error });
}

const sendValidationError = (res, details) =>
  sendError(res, 400, "VALIDATION_ERROR", "Movie data is invalid", details);
const sendInvalidId = (res) =>
  sendError(res, 400, "INVALID_ID", "id must be a positive integer");
const sendMovieNotFound = (res) =>
  sendError(res, 404, "MOVIE_NOT_FOUND", "Movie not found");
const sendInvalidQuery = (res, message) =>
  sendError(res, 400, "INVALID_QUERY_PARAMETER", message);

// ---------- Routes ----------

// Health check: proves that Express can run SQL in PostgreSQL
app.get("/health/database", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");
    res.json({
      status: "ok",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    next(error);
  }
});

// GET /movies  (optional: ?director=nolan&minYear=2000&sortBy=id|year|title)
app.get("/movies", async (req, res, next) => {
  try {
    const { director, minYear, sortBy } = req.query;

    // A repeated parameter (?director=a&director=b) arrives as an array
    for (const [name, value] of Object.entries({ director, minYear, sortBy })) {
      if (value !== undefined && typeof value !== "string") {
        return sendInvalidQuery(res, `${name} must be given only once`);
      }
    }

    const conditions = [];
    const values = [];

    if (director !== undefined) {
      // Case-insensitive "contains" search; the text is a parameter
      values.push(`%${director}%`);
      conditions.push(`director ILIKE $${values.length}`);
    }

    if (minYear !== undefined) {
      if (!/^\d+$/.test(minYear)) {
        return sendInvalidQuery(res, "minYear must be an integer");
      }
      values.push(Number(minYear));
      conditions.push(`release_year >= $${values.length}`);
    }

    // Column names cannot be $1 parameters, so only allow-listed values
    // from the server can become part of the SQL text.
    const sortColumns = { id: "id", year: "release_year", title: "title" };
    let orderBy = "id";
    if (sortBy !== undefined) {
      if (!Object.hasOwn(sortColumns, sortBy)) {
        return sendInvalidQuery(res, "sortBy must be 'id', 'year' or 'title'");
      }
      orderBy = sortColumns[sortBy];
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT ${MOVIE_COLUMNS} FROM movies ${where} ORDER BY ${orderBy}, id`,
      values
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /movies/:id
app.get("/movies/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res);

    const result = await pool.query(
      `SELECT ${MOVIE_COLUMNS} FROM movies WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return sendMovieNotFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /movies -> PostgreSQL generates the id
app.post("/movies", async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateMovie(body, false);
    if (errors.length > 0) return sendValidationError(res, errors);

    const result = await pool.query(
      `INSERT INTO movies (title, director, release_year)
       VALUES ($1, $2, $3)
       RETURNING ${MOVIE_COLUMNS}`,
      [body.title.trim(), body.director.trim(), body.year]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /movies/:id -> full replacement (all fields required)
app.put("/movies/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res);

    const body = req.body || {};
    const errors = validateMovie(body, false);
    if (errors.length > 0) return sendValidationError(res, errors);

    const result = await pool.query(
      `UPDATE movies
       SET title = $1, director = $2, release_year = $3
       WHERE id = $4
       RETURNING ${MOVIE_COLUMNS}`,
      [body.title.trim(), body.director.trim(), body.year, id]
    );

    if (result.rows.length === 0) return sendMovieNotFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /movies/:id -> partial update with controlled dynamic SQL
app.patch("/movies/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res);

    const body = req.body || {};

    // Allow-list: JSON property -> database column (defined by the server)
    const allowedFields = {
      title: "title",
      director: "director",
      year: "release_year",
    };

    const setClauses = [];
    const values = [];

    for (const [field, column] of Object.entries(allowedFields)) {
      if (body[field] !== undefined) {
        const value = typeof body[field] === "string" ? body[field].trim() : body[field];
        values.push(value);
        setClauses.push(`${column} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return sendValidationError(res, [
        "Provide at least one of: title, director, year",
      ]);
    }

    const errors = validateMovie(body, true);
    if (errors.length > 0) return sendValidationError(res, errors);

    values.push(id);
    const result = await pool.query(
      `UPDATE movies
       SET ${setClauses.join(", ")}
       WHERE id = $${values.length}
       RETURNING ${MOVIE_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) return sendMovieNotFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /movies/:id -> 204 No Content (no JSON body)
app.delete("/movies/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendInvalidId(res);

    const result = await pool.query(
      "DELETE FROM movies WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) return sendMovieNotFound(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ---------- Middleware after the routes ----------

// Unknown routes -> JSON 404
app.use((req, res) => {
  sendError(res, 404, "ROUTE_NOT_FOUND", "The requested route does not exist");
});

// Central error handler: database and other unexpected errors end up here
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
  }

  // Log the details on the server, but do not send them to the client
  console.error(err);
  sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "An unexpected server error occurred"
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
