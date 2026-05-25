import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres",
      database: process.env.PGDATABASE || "digitalafrika",
    });

export const query = (text, params = []) => pool.query(text, params);

export async function runMigrations() {
  await query(`
    ALTER TABLE employes
    ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT '{}'::jsonb
  `);
  await query(`
    ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS entite_id UUID
  `);

  const multiTenantSql = readFileSync(
    join(__dirname, "migrations", "multi_tenant.sql"),
    "utf8"
  );
  await query(multiTenantSql);

  console.log("✅ Migrations OK");
}

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ Connexion PostgreSQL OK");
  } finally {
    client.release();
  }
  await runMigrations();
}

export default pool;
