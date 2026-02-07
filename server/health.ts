import { Router } from "express";
import { getPool } from "./db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.json({ status: "ok", db: "not_configured" });
    }

    await pool.query("SELECT 1");
    return res.json({ status: "ok", db: "ok" });
  } catch (err) {
    return res.status(500).json({ status: "db_error", error: String(err) });
  }
});

export default router;
