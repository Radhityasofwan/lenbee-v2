import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured. Copy .env.example to .env.local and fill it in.");
}

export type Db = MySql2Database<typeof schema>;

type GlobalWithPool = typeof globalThis & {
  __lenbeePool?: mysql.Pool;
  __lenbeeDb?: Db;
};

const g = globalThis as GlobalWithPool;

export const pool =
  g.__lenbeePool ??
  mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "local",
    dateStrings: false,
    supportBigNumbers: true,
  });

export const db: Db = g.__lenbeeDb ?? drizzle(pool, { schema, mode: "default" });

if (process.env.NODE_ENV !== "production") {
  g.__lenbeePool = pool;
  g.__lenbeeDb = db;
}

export { schema };
