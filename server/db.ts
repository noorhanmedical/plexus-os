import pg from "pg";
const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

export function getPool() {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  _pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  });

  return _pool;
}
