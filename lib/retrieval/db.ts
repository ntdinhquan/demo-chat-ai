import { Pool } from "pg";

let pool: Pool | null = null;

/** Lazy singleton — connects to the real-data warehouse restored via docker-compose (see CLAUDE.md), not the app's own DATABASE_URL. */
export function getWarehousePool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.WAREHOUSE_DATABASE_URL });
  }
  return pool;
}
