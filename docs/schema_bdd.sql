-- ============================================================
-- DIGITALAFRIKA — Schéma BDD PostgreSQL
-- Application de Pointage du Personnel v2.1
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SERVICES
-- ============================================================
CREATE TABLE services (
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
    ('Logistique',           'Gestion des opérations');

-- ============================================================
-- 2. EMPLOYES
-- ============================================================
CREATE TYPE type_contrat_enum AS ENUM ('CDI','CDD','Stage','Prestataire');
CREATE TYPE role_enum AS ENUM ('employee','admin','superadmin');

CREATE TABLE employes (
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
    created_by       UUID REFERENCES employes(id),
    CONSTRAINT chk_dates CHECK (date_fin_contrat IS NULL OR date_fin_contrat >= date_embauche),
    CONSTRAINT chk_horaires CHECK (heure_fin > heure_debut)
);

CREATE INDEX idx_employes_service ON employes(service_id);
CREATE INDEX idx_employes_role ON employes(role);
CREATE INDEX idx_employes_actif ON employes(actif);
CREATE INDEX idx_employes_badge ON employes(uid_badge);

-- ============================================================
-- 3. TYPES_ABSENCE
-- ============================================================
CREATE TABLE types_absence (
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
    ('ABSENCE_EXCEPT', 'Absence exceptionnelle', FALSE);

-- ============================================================
-- 4. POINTAGES
-- ============================================================
CREATE TYPE statut_pointage_enum AS ENUM ('present','retard','absent','jour_ferie','weekend','non_pointe');

CREATE TABLE pointages (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id            UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    date                  DATE NOT NULL DEFAULT CURRENT_DATE,
    heure_arrivee         TIMESTAMP,
    heure_depart          TIMESTAMP,
    statut                statut_pointage_enum NOT NULL DEFAULT 'non_pointe',
    retard_minutes        INT NOT NULL DEFAULT 0,
    heures_sup_minutes    INT NOT NULL DEFAULT 0,
    duree_travail_minutes INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pointage_jour UNIQUE (employe_id, date),
    CONSTRAINT chk_retard     CHECK (retard_minutes >= 0),
    CONSTRAINT chk_heures_sup CHECK (heures_sup_minutes >= 0)
);

CREATE INDEX idx_pointages_employe_date ON pointages(employe_id, date);
CREATE INDEX idx_pointages_date ON pointages(date);
CREATE INDEX idx_pointages_statut ON pointages(statut);

-- ============================================================
-- 5. ABSENCES
-- ============================================================
CREATE TYPE statut_absence_enum AS ENUM ('en_attente','approuvee','rejetee','annulee');

CREATE TABLE absences (
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

CREATE INDEX idx_absences_employe ON absences(employe_id);
CREATE INDEX idx_absences_statut ON absences(statut);
CREATE INDEX idx_absences_dates ON absences(date_debut, date_fin);

-- ============================================================
-- 6. JUSTIFICATIFS
-- ============================================================
CREATE TYPE statut_justificatif_enum AS ENUM ('en_attente','valide','rejete');

CREATE TABLE justificatifs (
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

CREATE INDEX idx_justificatifs_absence ON justificatifs(absence_id);

-- ============================================================
-- 7. SANCTIONS
-- ============================================================
CREATE TYPE type_sanction_enum AS ENUM ('rappel_verbal','avertissement','sanction_disciplinaire');
CREATE TYPE statut_sanction_enum AS ENUM ('alerte','traite');

CREATE TABLE sanctions (
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

CREATE INDEX idx_sanctions_employe ON sanctions(employe_id);
CREATE INDEX idx_sanctions_statut ON sanctions(statut);

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employe_id  UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL,
    titre       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    lue         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_type CHECK (type IN ('retard','absence_validee','absence_rejetee','absence_annulee','sanction','rappel','system','bienvenue'))
);

CREATE INDEX idx_notif_employe_lue ON notifications(employe_id, lue);

-- ============================================================
-- 9. JOURS_FERIES
-- ============================================================
CREATE TABLE jours_feries (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date       DATE NOT NULL,
    libelle    VARCHAR(100) NOT NULL,
    recurrent  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES employes(id)
);

CREATE INDEX idx_jours_feries_date ON jours_feries(date);

INSERT INTO jours_feries (date, libelle, recurrent) VALUES
    ('2026-01-01', 'Jour de l''An',            TRUE),
    ('2026-04-04', 'Fête de l''Indépendance',   TRUE),
    ('2026-05-01', 'Fête du Travail',           TRUE),
    ('2026-08-15', 'Assomption',                TRUE),
    ('2026-11-01', 'Toussaint',                 TRUE),
    ('2026-12-25', 'Noël',                      TRUE);

-- ============================================================
-- 10. AUDIT_LOGS (SuperAdmin — préparé)
-- ============================================================
CREATE TABLE audit_logs (
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

CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- 11. CONFIGURATIONS (SuperAdmin — préparé)
-- ============================================================
CREATE TABLE configurations (
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
    ('delai_min_entre_scans',  '300',   'Délai min entre 2 scans (secondes)');

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

CREATE TRIGGER trg_employes_ts BEFORE UPDATE ON employes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_pointages_ts BEFORE UPDATE ON pointages FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_absences_ts BEFORE UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_services_ts BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- DONNÉES DE TEST
-- ============================================================
-- Admin
INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0001','Jean','Diallo','admin@digitalafrika.com',crypt('admin123',gen_salt('bf')),'+221771234567','admin',
       id,'Responsable RH','CDI','2024-01-15',FALSE,'A1B2C3D4' FROM services WHERE nom='Ressources Humaines';

-- Employés
INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0002','Aminata','Sow','aminata@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221772345678','employee',
       id,'Développeuse Full-Stack','CDI','2024-03-01',FALSE,'E5F6G7H8','09:00','18:00' FROM services WHERE nom='Technique';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0003','Moussa','Ndiaye','moussa@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221773456789','employee',
       id,'Designer UI/UX','CDD','2025-06-01',FALSE,'I9J0K1L2' FROM services WHERE nom='Technique';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0004','Fatou','Ba','fatou@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221774567890','employee',
       id,'Responsable commerciale','CDI','2024-02-15',FALSE,'M3N4O5P6' FROM services WHERE nom='Commercial';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0005','Ibrahima','Fall','ibrahima@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221775678901','employee',
       id,'Chef logistique','CDI','2023-09-01',FALSE,'Q7R8S9T0','07:30','16:30' FROM services WHERE nom='Logistique';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, date_fin_contrat, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0006','Ousmane','Sarr','ousmane@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221776789012','employee',
       id,'Stagiaire développeur','Stage','2026-02-01','2026-07-31',FALSE,'U1V2W3X4','09:00','18:00' FROM services WHERE nom='Technique';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0007','Awa','Diop','awa@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221777890123','employee',
       id,'Chargée de clientèle','CDI','2025-01-10',FALSE,'Y5Z6A7B8' FROM services WHERE nom='Commercial';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0008','Cheikh','Mbaye','cheikh@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221778901234','employee',
       id,'Directeur adjoint','CDI','2023-01-01',FALSE,'C9D0E1F2' FROM services WHERE nom='Direction';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0009','Mariama','Thiam','mariama@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221779012345','employee',
       id,'Assistante RH','CDD','2025-09-01',FALSE,'G3H4I5J6' FROM services WHERE nom='Ressources Humaines';

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0010','Abdoulaye','Gueye','abdoulaye@digitalafrika.com',crypt('emp123',gen_salt('bf')),'+221770123456','employee',
       id,'Agent logistique','CDI','2024-06-01',FALSE,'K7L8M9N0','07:30','16:30' FROM services WHERE nom='Logistique';
