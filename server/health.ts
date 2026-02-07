import { Router } from "express";
import { getPool } from "./db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(200).json({ status: "ok", db: "not_configured" });
    }

    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok", db: "ok" });
  } catch (err) {
    // IMPORTANT: keep status 200 so App Runner doesn't kill the service during startup
    return res.status(200).json({ status: "ok", db: "down", error: String(err) });
  }
});

export default router;
