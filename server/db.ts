import { Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized for Neon Serverless
export const pool = new NeonPool({ 
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
