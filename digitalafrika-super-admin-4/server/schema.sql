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
  admin_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configurations (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  modified_by INTEGER REFERENCES employes(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS absences (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('maladie', 'conge', 'conge_sans_solde', 'formation', 'mission', 'autre')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
  motif TEXT,
  justificatif_url TEXT,
  valide_par INTEGER REFERENCES employes(id),
  date_validation TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pointages (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  date_pointage DATE NOT NULL,
  heure_entree TIME,
  heure_sortie TIME,
  type_pointage VARCHAR(20) NOT NULL CHECK (type_pointage IN ('present', 'absent', 'retard', 'demi_journee')),
  heures_travaillees DECIMAL(4,2) DEFAULT 0,
  heures_supplementaires DECIMAL(4,2) DEFAULT 0,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sanctions (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('avertissement', 'blame', 'mise_a_pied', 'licenciement')),
  motif TEXT NOT NULL,
  date_incident DATE NOT NULL,
  date_decision DATE NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'annule', 'archive')),
  decisionnee_par INTEGER REFERENCES employes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_absences_employe ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_pointages_employe ON pointages(employe_id);
CREATE INDEX IF NOT EXISTS idx_pointages_date ON pointages(date_pointage);
CREATE INDEX IF NOT EXISTS idx_sanctions_employe ON sanctions(employe_id);
