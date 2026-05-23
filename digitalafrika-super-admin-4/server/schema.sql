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

-- ===== NOUVELLE TABLE DÉCISIONS RH =====
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

CREATE INDEX IF NOT EXISTS idx_absences_employe ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_pointages_employe ON pointages(employe_id);
CREATE INDEX IF NOT EXISTS idx_pointages_date ON pointages(date_pointage);
CREATE INDEX IF NOT EXISTS idx_sanctions_employe ON sanctions(employe_id);
CREATE INDEX IF NOT EXISTS idx_decisions_rh_statut ON decisions_rh(statut);
CREATE INDEX IF NOT EXISTS idx_decisions_rh_rh ON decisions_rh(rh_id);

-- ===== TABLE ENTREPRISES =====
CREATE TABLE IF NOT EXISTS entreprises (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(160) UNIQUE NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan_id INTEGER NOT NULL DEFAULT 1,
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  subscription_ends_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== TABLE PLANS (Formules d'abonnement) =====
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  prix DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_employes INTEGER NOT NULL DEFAULT 10,
  fonctionnalites JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ===== AJOUTER company_id À LA TABLE employes =====
ALTER TABLE employes ADD COLUMN IF NOT EXISTS entreprise_id INTEGER REFERENCES entreprises(id) ON DELETE CASCADE;

-- ===== INSÉRER LES PLANS PAR DÉFAUT =====
INSERT INTO plans (nom, slug, prix, max_employes, fonctionnalites) VALUES
('Starter', 'starter', 0, 10, '{"pointage_base": true, "rapports_simples": true, "export_excel": false, "geolocalisation": false}'::jsonb),
('Pro', 'pro', 29000, 50, '{"pointage_avance": true, "rapports_avances": true, "export_excel": true, "geolocalisation": true}'::jsonb),
('Enterprise', 'enterprise', 99000, -1, '{"pointage_avance": true, "rapports_avances": true, "export_excel": true, "geolocalisation": true, "api": true, "support_dedie": true, "personnalisation": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

psql -U postgres -d digitalafrika << 'EOF'
-- Créer la table services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(120) UNIQUE NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer des services par défaut
INSERT INTO services (nom) VALUES
  ('Direction'),
  ('Commercial'),
  ('Administratif'),
  ('Logistique'),
  ('IT'),
  ('RH')
ON CONFLICT (nom) DO NOTHING;

-- Ajouter la colonne matricule si elle n'existe pas
ALTER TABLE employes ADD COLUMN IF NOT EXISTS matricule VARCHAR(50);

-- Créer la table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER REFERENCES employes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  titre VARCHAR(200) NOT NULL,
  message TEXT,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

EOF