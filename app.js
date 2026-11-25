// Movie REST API - Backend Development, Week 5 (modular structure)
// app.js only sets up the application: middleware, routers, error
// handling and server startup.
import "dotenv/config";
import express from "express";
import morgan from "morgan";

import movieRouter from "./routes/movies.js";
import healthRouter from "./routes/health.js";
import notFoundHandler from "./middleware/notFoundHandler.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Application-wide middleware
app.use(express.json());
app.use(morgan("dev"));

// Routers
app.use("/health", healthRouter);
app.use("/movies", movieRouter);

// These must come after all valid routes
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
