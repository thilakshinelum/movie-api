// Runs a Joi schema against req.body before the Controller.
// Usage in a router: validateMovie(movieCreateSchema)
import { joiOptions } from "../validation/movieValidation.js";

export default function validateMovie(schema) {
  return (req, res, next) => {
    // A request without a JSON body has no req.body: validate {} instead
    const { error, value } = schema.validate(req.body ?? {}, joiOptions);

    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Movie data is invalid",
          details: error.details.map((detail) => detail.message),
        },
      });
    }

    // Store the validated, normalized data (e.g. trimmed strings)
    req.body = value;
    next();
  };
}
