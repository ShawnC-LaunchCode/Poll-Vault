import dotenv from "dotenv";
dotenv.config();

import * as schema from "@shared/schema";
import type { Pool } from 'pg';
import type { Pool as NeonPool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon serverless or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') ||
                       process.env.DATABASE_URL.includes('neon.co');

let pool: Pool | NeonPool;
let db: any;

// Initialize database connection asynchronously
(async () => {
  if (isNeonDatabase) {
    // Use Neon serverless driver for cloud databases
    const { Pool: NeonPoolClass, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');

    neonConfig.webSocketConstructor = ws.default;
    pool = new NeonPoolClass({ connectionString: process.env.DATABASE_URL });

    const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-serverless');
    db = drizzleNeon(pool as any, { schema });
  } else {
    // Use standard PostgreSQL driver for local databases
    const pg = await import('pg');
    pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

    const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
    db = drizzlePg(pool as any, { schema });
  }
})();

export { pool, db };
