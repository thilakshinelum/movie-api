// Health check: proves that the API can run SQL in PostgreSQL
import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

router.get("/database", async (req, res) => {
  const result = await pool.query("SELECT NOW() AS database_time");
  res.json({
    status: "ok",
    databaseTime: result.rows[0].database_time,
  });
});

export default router;
