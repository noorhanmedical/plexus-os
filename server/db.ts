import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function dbHealthCheck() {
  const p = getPool();
  const result = await p.query("SELECT 1 as ok");
  return result.rows?.[0]?.ok === 1;
}
