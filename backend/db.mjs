import pg from "pg";
const { Pool } = pg;

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
