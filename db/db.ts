import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export const databaseUrl = process.env.DATABASE_URL;
export const hasDatabase = Boolean(databaseUrl);

const sql = neon(databaseUrl || 'postgresql://placeholder:placeholder@localhost/placeholder');
export const db = drizzle(sql, { schema });

export function getDb() {
  if (!hasDatabase) {
    throw new Error('DATABASE_URL is not configured');
  }

  return db;
}
