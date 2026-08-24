import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const isProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode="));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
