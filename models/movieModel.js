// Movie Model: the only place that knows SQL, PostgreSQL and column names.
// It receives and returns ordinary JavaScript data and never uses req, res
// or HTTP status codes.
import pool from "../config/db.js";

// release_year is returned as year, so the JSON keeps the same shape
const COLUMNS = "id, title, director, release_year AS year";

// JSON property -> database column (server-side allow-lists)
const FIELD_COLUMNS = {
  title: "title",
  director: "director",
  year: "release_year",
};
const SORT_COLUMNS = { id: "id", title: "title", year: "release_year" };

// filters: { director, minYear, sortBy } - all optional
export async function findAll(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.director !== undefined) {
    values.push(`%${filters.director}%`);
    conditions.push(`director ILIKE $${values.length}`);
  }
  if (filters.minYear !== undefined) {
    values.push(filters.minYear);
    conditions.push(`release_year >= $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = SORT_COLUMNS[filters.sortBy] ?? "id";

  const result = await pool.query(
    `SELECT ${COLUMNS} FROM movies ${where} ORDER BY ${orderBy}, id`,
    values
  );
  return result.rows;
}

// Returns the movie, or null if it does not exist
export async function findById(id) {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM movies WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function create(movie) {
  const result = await pool.query(
    `INSERT INTO movies (title, director, release_year)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [movie.title, movie.director, movie.year]
  );
  return result.rows[0];
}

// Full replacement. Returns the updated movie, or null if it does not exist
export async function replace(id, movie) {
  const result = await pool.query(
    `UPDATE movies
     SET title = $1, director = $2, release_year = $3
     WHERE id = $4
     RETURNING ${COLUMNS}`,
    [movie.title, movie.director, movie.year, id]
  );
  return result.rows[0] ?? null;
}

// Partial update: only allow-listed fields become part of the SQL text,
// the values are always parameters. Returns the movie, or null.
export async function update(id, updates) {
  const setClauses = [];
  const values = [];

  for (const [field, column] of Object.entries(FIELD_COLUMNS)) {
    if (updates[field] !== undefined) {
      values.push(updates[field]);
      setClauses.push(`${column} = $${values.length}`);
    }
  }

  // Nothing to change: just return the current movie
  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE movies
     SET ${setClauses.join(", ")}
     WHERE id = $${values.length}
     RETURNING ${COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

// Returns true if a movie was deleted, false if it did not exist
export async function remove(id) {
  const result = await pool.query(
    "DELETE FROM movies WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rowCount > 0;
}
