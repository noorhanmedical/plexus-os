import type { Express } from "express";

export function registerHealthRoutes(app: Express) {
  // Simple health check - no external dependencies
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "plexus-os-api" });
  });

  // Version endpoint with timestamp
  app.get("/api/version", (_req, res) => {
    res.json({
      ok: true,
      version: "2.0",
      timestamp: new Date().toISOString()
    });
  });

  // Database health - hardened against crashes
  app.get("/api/db-health", async (_req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(500).json({ ok: false, error: "DATABASE_URL missing" });
      }

      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      const result = await pool.query("SELECT NOW()");
      await pool.end();

      res.json({ ok: true, database: "connected", timestamp: result.rows[0].now });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error?.message || "db-health failed" });
    }
  });
}
