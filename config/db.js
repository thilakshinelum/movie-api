// PostgreSQL connection pool (node-postgres)
// dotenv/config loads .env before the Pool reads process.env
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// Log errors on idle connections (e.g. PostgreSQL stopped) instead of
// letting them crash the whole application.
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool;
