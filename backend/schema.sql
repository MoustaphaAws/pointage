-- ============================================================
-- DIGITALAFRIKA — Schéma BDD PostgreSQL
-- Application de Pointage du Personnel v2.1
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom         VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO services (nom, description) VALUES
    ('Direction',            'Direction générale'),
    ('Ressources Humaines',  'Gestion du personnel'),
    ('Technique',            'Développement et IT'),
    ('Commercial',           'Ventes et marketing'),
    ('Logistique',           'Gestion des opérations')
ON CONFLICT (nom) DO NOTHING;

-- ============================================================
-- 2. EMPLOYES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE type_contrat_enum AS ENUM ('CDI','CDD','Stage','Prestataire');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('employee','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS employes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricule        VARCHAR(20) NOT NULL UNIQUE,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    phone            VARCHAR(20),
    address          TEXT,
    photo_url        VARCHAR(500),
    role             role_enum NOT NULL DEFAULT 'employee',
    actif            BOOLEAN NOT NULL DEFAULT TRUE,
    first_login      BOOLEAN NOT NULL DEFAULT TRUE,
    uid_badge        VARCHAR(50) UNIQUE,
    badge_actif      BOOLEAN NOT NULL DEFAULT TRUE,
    service_id       UUID NOT NULL REFERENCES services(id),
    poste            VARCHAR(100) NOT NULL,
    type_contrat     type_contrat_enum NOT NULL DEFAULT 'CDI',
    date_embauche    DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin_contrat DATE,
    heure_debut      TIME NOT NULL DEFAULT '08:00',
    heure_fin        TIME NOT NULL DEFAULT '17:00',
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    reset_token      VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_by       UUID REFERENCES employes(id),
    CONSTRAINT chk_dates CHECK (date_fin_contrat IS NULL OR date_fin_contrat >= date_embauche),
    CONSTRAINT chk_horaires CHECK (heure_fin > heure_debut)
);

CREATE INDEX IF NOT EXISTS idx_employes_service ON employes(service_id);
CREATE INDEX IF NOT EXISTS idx_employes_role ON employes(role);
CREATE INDEX IF NOT EXISTS idx_employes_actif ON employes(actif);
CREATE INDEX IF NOT EXISTS idx_employes_badge ON employes(uid_badge);

-- ============================================================
-- 3. TYPES_ABSENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS types_absence (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(30) NOT NULL UNIQUE,
    libelle             VARCHAR(100) NOT NULL,
    justificatif_requis BOOLEAN NOT NULL DEFAULT FALSE,
    actif               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO types_absence (code, libelle, justificatif_requis) VALUES
    ('CONGE_PAYE',     'Congé payé',             FALSE),
    ('CONGE_MALADIE',  'Congé maladie',          TRUE),
    ('ABSENCE_INJUST', 'Absence non justifiée',  FALSE),
    ('PERMISSION',     'Permission autorisée',   FALSE),
    ('FORMATION',      'Formation / Mission',    FALSE),
    ('ABSENCE_EXCEPT', 'Absence exceptionnelle', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. POINTAGES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE statut_pointage_enum AS ENUM ('present','retard','absent','jour_ferie','weekend','non_pointe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pointages (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id            UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    date                  DATE NOT NULL DEFAULT CURRENT_DATE,
    heure_arrivee         TIMESTAMP,
    heure_depart          TIMESTAMP,
    statut                statut_pointage_enum NOT NULL DEFAULT 'non_pointe',
    retard_minutes        INT NOT NULL DEFAULT 0,
    heures_sup_minutes    INT NOT NULL DEFAULT 0,
    duree_travail_minutes INT NOT NULL DEFAULT 0,
    source                VARCHAR(20) DEFAULT 'qr',
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pointage_jour UNIQUE (employe_id, date),
    CONSTRAINT chk_retard     CHECK (retard_minutes >= 0),
    CONSTRAINT chk_heures_sup CHECK (heures_sup_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pointages_employe_date ON pointages(employe_id, date);
CREATE INDEX IF NOT EXISTS idx_pointages_date ON pointages(date);
CREATE INDEX IF NOT EXISTS idx_pointages_statut ON pointages(statut);

-- ============================================================
-- 5. ABSENCES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE statut_absence_enum AS ENUM ('en_attente','approuvee','rejetee','annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS absences (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id           UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    type_absence_id      UUID NOT NULL REFERENCES types_absence(id),
    date_debut           DATE NOT NULL,
    date_fin             DATE NOT NULL,
    demi_journee         BOOLEAN NOT NULL DEFAULT FALSE,
    periode_demi_journee VARCHAR(10),
    motif                TEXT,
    statut               statut_absence_enum NOT NULL DEFAULT 'en_attente',
    motif_rejet          TEXT,
    valide_par           UUID REFERENCES employes(id),
    date_validation      TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates_absence CHECK (date_fin >= date_debut),
    CONSTRAINT chk_demi CHECK (demi_journee = FALSE OR periode_demi_journee IN ('matin','apres_midi'))
);

CREATE INDEX IF NOT EXISTS idx_absences_employe ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_statut ON absences(statut);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin);

-- ============================================================
-- 6. JUSTIFICATIFS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE statut_justificatif_enum AS ENUM ('en_attente','valide','rejete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS justificatifs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    absence_id      UUID NOT NULL REFERENCES absences(id) ON DELETE CASCADE,
    nom_fichier     VARCHAR(255) NOT NULL,
    chemin_fichier  VARCHAR(500) NOT NULL,
    type_mime       VARCHAR(50) NOT NULL,
    taille_octets   INT NOT NULL,
    statut          statut_justificatif_enum NOT NULL DEFAULT 'en_attente',
    motif_rejet     TEXT,
    valide_par      UUID REFERENCES employes(id),
    date_validation TIMESTAMP,
    uploaded_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    uploaded_by     UUID NOT NULL REFERENCES employes(id),
    CONSTRAINT chk_taille CHECK (taille_octets > 0 AND taille_octets <= 5242880),
    CONSTRAINT chk_mime CHECK (type_mime IN ('application/pdf','image/jpeg','image/jpg','image/png'))
);

CREATE INDEX IF NOT EXISTS idx_justificatifs_absence ON justificatifs(absence_id);

-- ============================================================
-- 7. SANCTIONS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE type_sanction_enum AS ENUM ('rappel_verbal','avertissement','sanction_disciplinaire');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_sanction_enum AS ENUM ('alerte','traite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sanctions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id        UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    type_sanction     type_sanction_enum NOT NULL,
    motif             TEXT NOT NULL,
    nb_retards        INT NOT NULL DEFAULT 0,
    nb_absences_injust INT NOT NULL DEFAULT 0,
    statut            statut_sanction_enum NOT NULL DEFAULT 'alerte',
    traite_par        UUID REFERENCES employes(id),
    date_traitement   TIMESTAMP,
    commentaire_admin TEXT,
    mois_reference    DATE NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanctions_employe ON sanctions(employe_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_statut ON sanctions(statut);

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id  UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL,
    titre       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    lue         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_type CHECK (type IN ('retard','absence_validee','absence_rejetee','absence_annulee','sanction','rappel','system','bienvenue'))
);

CREATE INDEX IF NOT EXISTS idx_notif_employe_lue ON notifications(employe_id, lue);

-- ============================================================
-- 9. JOURS_FERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS jours_feries (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date       DATE NOT NULL,
    libelle    VARCHAR(100) NOT NULL,
    recurrent  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES employes(id)
);

CREATE INDEX IF NOT EXISTS idx_jours_feries_date ON jours_feries(date);

-- ============================================================
-- 10. QR_TOKENS (pour le pointage par QR Code)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token       VARCHAR(255) NOT NULL UNIQUE,
    date        DATE NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    genere_par  UUID REFERENCES employes(id),
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_date ON qr_tokens(date);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);

-- ============================================================
-- 11. AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES employes(id),
    user_role  role_enum,
    action     VARCHAR(50) NOT NULL,
    entite     VARCHAR(50) NOT NULL,
    entite_id  UUID,
    details    JSONB,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- 12. CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS configurations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cle         VARCHAR(100) NOT NULL UNIQUE,
    valeur      TEXT NOT NULL,
    description TEXT,
    modifie_par UUID REFERENCES employes(id),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO configurations (cle, valeur, description) VALUES
    ('heure_debut_defaut',     '08:00', 'Heure arrivée par défaut'),
    ('heure_fin_defaut',       '17:00', 'Heure départ par défaut'),
    ('seuil_rappel_retards',   '3',     'Retards pour rappel verbal'),
    ('seuil_avertissement',    '5',     'Retards pour avertissement'),
    ('seuil_sanction',         '6',     'Retards pour sanction'),
    ('seuil_absence_avert',    '1',     'Absences injustifiées pour avertissement'),
    ('seuil_absence_sanction', '2',     'Absences injustifiées pour sanction'),
    ('taille_max_fichier',     '5242880','Taille max fichier en octets'),
    ('jwt_expiration_heures',  '8',     'Durée JWT en heures'),
    ('delai_min_entre_scans',  '300',   'Délai min entre 2 scans (secondes)')
ON CONFLICT (cle) DO NOTHING;

-- ============================================================
-- FONCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION generate_matricule() RETURNS TEXT AS $$
DECLARE next_num INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(matricule FROM 4) AS INT)), 0) + 1
    INTO next_num FROM employes WHERE matricule LIKE 'DA-%';
    RETURN 'DA-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculer_retard(p_arrivee TIMESTAMP, p_debut TIME) RETURNS INT AS $$
BEGIN
    RETURN GREATEST(EXTRACT(EPOCH FROM (p_arrivee::TIME - p_debut))::INT / 60, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculer_heures_sup(p_depart TIMESTAMP, p_fin TIME) RETURNS INT AS $$
BEGIN
    RETURN GREATEST(EXTRACT(EPOCH FROM (p_depart::TIME - p_fin))::INT / 60, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employes_ts ON employes;
CREATE TRIGGER trg_employes_ts BEFORE UPDATE ON employes FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_pointages_ts ON pointages;
CREATE TRIGGER trg_pointages_ts BEFORE UPDATE ON pointages FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_absences_ts ON absences;
CREATE TRIGGER trg_absences_ts BEFORE UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_services_ts ON services;
CREATE TRIGGER trg_services_ts BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- JOURS FÉRIÉS PAR DÉFAUT
-- ============================================================
INSERT INTO jours_feries (date, libelle, recurrent) VALUES
    ('2026-01-01', 'Jour de l''An',            TRUE),
    ('2026-04-04', 'Fête de l''Indépendance',   TRUE),
    ('2026-05-01', 'Fête du Travail',           TRUE),
    ('2026-08-15', 'Assomption',                TRUE),
    ('2026-11-01', 'Toussaint',                 TRUE),
    ('2026-12-25', 'Noël',                      TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMPTE SUPERADMIN
-- ============================================================
INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0000', 'Super', 'Admin', 'boss@digitalafrika.com', crypt('Admin@2026!', gen_salt('bf')), '+221770000000', 'superadmin',
       id, 'Directeur Général', 'CDI', '2022-01-01', FALSE, 'SUPER-RFID-001'
FROM services WHERE nom = 'Direction'
ON CONFLICT (email) DO NOTHING;
