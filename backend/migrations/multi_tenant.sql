-- ============================================================
-- Multi-entreprises : plans, entreprises, liaison employes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    prix DECIMAL(10, 2) NOT NULL DEFAULT 0,
    max_employes INTEGER NOT NULL DEFAULT 10,
    fonctionnalites JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO plans (nom, slug, prix, max_employes, fonctionnalites) VALUES
    ('Starter', 'starter', 0, 10, '{"pointage_base": true, "rapports_simples": true, "export_excel": false}'::jsonb),
    ('Pro', 'pro', 29000, 50, '{"pointage_avance": true, "rapports_avances": true, "export_excel": true}'::jsonb),
    ('Enterprise', 'enterprise', 99000, -1, '{"pointage_avance": true, "rapports_avances": true, "export_excel": true, "api": true, "support_dedie": true, "personnalisation": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

UPDATE plans SET fonctionnalites = fonctionnalites - 'geolocalisation' WHERE fonctionnalites ? 'geolocalisation';

CREATE TABLE IF NOT EXISTS entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(160) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial'
        CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    trial_ends_at DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    subscription_ends_at DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entreprises_email ON entreprises(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_entreprises_slug ON entreprises(slug);

ALTER TABLE employes
    ADD COLUMN IF NOT EXISTS entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employes_entreprise ON employes(entreprise_id);
