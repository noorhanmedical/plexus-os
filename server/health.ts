import { Router } from "express";
import { getPool } from "./db.js";

const router = Router();

async function handler(_req: any, res: any) {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(200).json({ status: "ok", db: "not_configured" });
    }

    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok", db: "ok" });
  } catch (err) {
    // keep 200 so App Runner doesn't kill the service during startup
    return res.status(200).json({ status: "ok", db: "down", error: String(err) });
  }
}

router.get("/health", handler);
router.get("/api/health", handler);

export default router;
