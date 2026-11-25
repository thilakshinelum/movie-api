// Joi schemas: a description of what valid Movie request data looks like.
import Joi from "joi";

const MAX_YEAR = new Date().getFullYear() + 5;

// Field rules shared by all schemas
const title = Joi.string().trim().min(1).max(255);
const director = Joi.string().trim().min(1).max(255);
// strict(): only a real JSON number is accepted, not the text "2016"
const year = Joi.number().integer().strict().min(1888).max(MAX_YEAR);

// Common Joi options: report every problem, and show field names
// without quotes (title is required, not "title" is required)
export const joiOptions = {
  abortEarly: false,
  errors: { wrap: { label: false } },
};

// POST and PUT: a complete movie, every field required
export const movieCreateSchema = Joi.object({
  title: title.required(),
  director: director.required(),
  year: year.required(),
}).unknown(false);

// PATCH: same rules, fields optional, but at least one is required
export const movieUpdateSchema = Joi.object({
  title,
  director,
  year,
})
  .min(1)
  .unknown(false)
  .messages({
    "object.min": "provide at least one of: title, director, year",
  });

// GET /movies query parameters (all optional)
export const movieQuerySchema = Joi.object({
  director: Joi.string().trim().min(1).max(255),
  minYear: Joi.number().integer().min(0),
  sortBy: Joi.string().valid("id", "title", "year"),
}).unknown(false);
