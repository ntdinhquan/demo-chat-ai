import { Pool } from "pg";

// A module-level singleton so Next.js's hot-reload in dev doesn't spin up a
// fresh connection pool on every route invocation.
declare global {
  var _datawarehousePool: Pool | undefined;
}

export function getDatawarehousePool(): Pool {
  if (!global._datawarehousePool) {
    global._datawarehousePool = new Pool({
      connectionString: process.env.DATAWAREHOUSE_DATABASE_URL,
    });
  }
  return global._datawarehousePool;
}
