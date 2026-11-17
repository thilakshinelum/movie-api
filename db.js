// PostgreSQL connection pool (node-postgres)
// The values come from environment variables, which dotenv loads from .env
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// If PostgreSQL closes an idle connection (for example the server is
// stopped), log it instead of letting the error crash the whole app.
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = pool;
