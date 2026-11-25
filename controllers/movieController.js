// Movie Controller: HTTP behavior only. Reads the request, calls the Model
// and chooses the status code, headers and JSON response. No SQL here.
// Express 5 forwards errors from these async functions to errorHandler.
import * as Movie from "../models/movieModel.js";
import {
  movieQuerySchema,
  joiOptions,
} from "../validation/movieValidation.js";

function sendMovieNotFound(res) {
  return res.status(404).json({
    error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
  });
}

// GET /movies?director=nolan&minYear=2000&sortBy=year
export async function getMovies(req, res) {
  const { error, value } = movieQuerySchema.validate(req.query, joiOptions);
  if (error) {
    return res.status(400).json({
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: "Query parameters are invalid",
        details: error.details.map((detail) => detail.message),
      },
    });
  }

  const movies = await Movie.findAll(value);
  res.status(200).json(movies);
}

// GET /movies/:id
export async function getMovieById(req, res) {
  const movie = await Movie.findById(res.locals.movieId);
  if (!movie) return sendMovieNotFound(res);
  res.status(200).json(movie);
}

// POST /movies (req.body was validated by validateMovie)
export async function addMovie(req, res) {
  const movie = await Movie.create(req.body);
  res.location(`/movies/${movie.id}`);
  res.status(201).json(movie);
}

// PUT /movies/:id
export async function replaceMovie(req, res) {
  const movie = await Movie.replace(res.locals.movieId, req.body);
  if (!movie) return sendMovieNotFound(res);
  res.status(200).json(movie);
}

// PATCH /movies/:id
export async function updateMovie(req, res) {
  const movie = await Movie.update(res.locals.movieId, req.body);
  if (!movie) return sendMovieNotFound(res);
  res.status(200).json(movie);
}

// DELETE /movies/:id -> 204 No Content, no body
export async function deleteMovie(req, res) {
  const deleted = await Movie.remove(res.locals.movieId);
  if (!deleted) return sendMovieNotFound(res);
  res.status(204).end();
}
