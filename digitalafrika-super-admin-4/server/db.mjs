import { Pool } from "pg";

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

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS employes (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'admin', 'superadmin')),
      service VARCHAR(120) NOT NULL,
      poste VARCHAR(120),
      active BOOLEAN NOT NULL DEFAULT true,
      badge_uid VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE employes
    ADD COLUMN IF NOT EXISTS poste VARCHAR(120),
    ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT '{}'::jsonb;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS configurations (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      description TEXT,
      modified_by INTEGER REFERENCES employes(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES employes(id),
      user_name TEXT NOT NULL,
      role VARCHAR(20) NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS decisions_rh (
      id SERIAL PRIMARY KEY,
      rh_id INTEGER NOT NULL REFERENCES employes(id),
      employe_id INTEGER REFERENCES employes(id),
      type_decision VARCHAR(50) NOT NULL,
      decision_id INTEGER,
      action VARCHAR(100) NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'annulee')),
      commentaire_superadmin TEXT,
      traite_par INTEGER REFERENCES employes(id),
      date_traitement TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

// ===== FONCTIONS SUPERVISION SUPERADMIN =====

export async function desactiverEmploye(id) {
  const result = await query(
    'UPDATE employes SET active = false WHERE id = $1 RETURNING id, first_name, last_name, email, active',
    [id]
  );
  return result.rows[0];
}

export async function desactiverPlusieursEmployes(ids) {
  const result = await query(
    'UPDATE employes SET active = false WHERE id = ANY($1::int[]) RETURNING id, first_name, last_name, email, active',
    [ids]
  );
  return result.rows;
}

export async function reactiverEmploye(id) {
  const result = await query(
    'UPDATE employes SET active = true WHERE id = $1 RETURNING id, first_name, last_name, email, active',
    [id]
  );
  return result.rows[0];
}

export async function getDecisionsEnAttente() {
  const result = await query(
    "SELECT * FROM decisions_rh WHERE statut = 'en_attente' ORDER BY created_at DESC"
  );
  return result.rows;
}

export async function approuverDecision(id, superadminId, commentaire = null) {
  const result = await query(
    `UPDATE decisions_rh 
     SET statut = 'approuvee', traite_par = $2, commentaire_superadmin = $3, date_traitement = NOW() 
     WHERE id = $1 AND statut = 'en_attente' RETURNING *`,
    [id, superadminId, commentaire]
  );
  return result.rows[0];
}

export async function annulerDecision(id, superadminId, commentaire = null) {
  const result = await query(
    `UPDATE decisions_rh 
     SET statut = 'annulee', traite_par = $2, commentaire_superadmin = $3, date_traitement = NOW() 
     WHERE id = $1 AND statut = 'en_attente' RETURNING *`,
    [id, superadminId, commentaire]
  );
  return result.rows[0];
}

export default pool;