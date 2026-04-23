-- ============================================================
-- DIGITALAFRIKA — Données de test (seed)
-- À lancer APRÈS schema.sql
-- ============================================================

-- Admin RH
INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0001','Jean','Diallo','admin@digitalafrika.com',
       crypt('admin123', gen_salt('bf')),
       '+221771234567','admin',
       id,'Responsable RH','CDI','2024-01-15',FALSE,'A1B2C3D4'
FROM services WHERE nom='Ressources Humaines'
ON CONFLICT (email) DO NOTHING;

-- Employés
INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0002','Aminata','Sow','aminata@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221772345678','employee',
       id,'Développeuse Full-Stack','CDI','2024-03-01',FALSE,'E5F6G7H8','09:00','18:00'
FROM services WHERE nom='Technique'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0003','Moussa','Ndiaye','moussa@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221773456789','employee',
       id,'Designer UI/UX','CDD','2025-06-01',FALSE,'I9J0K1L2'
FROM services WHERE nom='Technique'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0004','Fatou','Ba','fatou@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221774567890','employee',
       id,'Responsable commerciale','CDI','2024-02-15',FALSE,'M3N4O5P6'
FROM services WHERE nom='Commercial'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0005','Ibrahima','Fall','ibrahima@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221775678901','employee',
       id,'Chef logistique','CDI','2023-09-01',FALSE,'Q7R8S9T0','07:30','16:30'
FROM services WHERE nom='Logistique'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, date_fin_contrat, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0006','Ousmane','Sarr','ousmane@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221776789012','employee',
       id,'Stagiaire développeur','Stage','2026-02-01','2026-07-31',FALSE,'U1V2W3X4','09:00','18:00'
FROM services WHERE nom='Technique'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0007','Awa','Diop','awa@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221777890123','employee',
       id,'Chargée de clientèle','CDI','2025-01-10',FALSE,'Y5Z6A7B8'
FROM services WHERE nom='Commercial'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0008','Cheikh','Mbaye','cheikh@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221778901234','employee',
       id,'Directeur adjoint','CDI','2023-01-01',FALSE,'C9D0E1F2'
FROM services WHERE nom='Direction'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
SELECT 'DA-0009','Mariama','Thiam','mariama@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221779012345','employee',
       id,'Assistante RH','CDD','2025-09-01',FALSE,'G3H4I5J6'
FROM services WHERE nom='Ressources Humaines'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge, heure_debut, heure_fin)
SELECT 'DA-0010','Abdoulaye','Gueye','abdoulaye@digitalafrika.com',
       crypt('emp123', gen_salt('bf')),
       '+221770123456','employee',
       id,'Agent logistique','CDI','2024-06-01',FALSE,'K7L8M9N0','07:30','16:30'
FROM services WHERE nom='Logistique'
ON CONFLICT (email) DO NOTHING;

-- Quelques absences de test
INSERT INTO absences (employe_id, type_absence_id, date_debut, date_fin, motif, statut)
SELECT e.id, t.id, '2026-05-01', '2026-05-05', 'Vacances familiales', 'en_attente'
FROM employes e, types_absence t
WHERE e.email = 'aminata@digitalafrika.com' AND t.code = 'CONGE_PAYE'
ON CONFLICT DO NOTHING;

INSERT INTO absences (employe_id, type_absence_id, date_debut, date_fin, motif, statut)
SELECT e.id, t.id, '2026-04-15', '2026-04-17', 'Grippe', 'approuvee'
FROM employes e, types_absence t
WHERE e.email = 'moussa@digitalafrika.com' AND t.code = 'CONGE_MALADIE'
ON CONFLICT DO NOTHING;

INSERT INTO absences (employe_id, type_absence_id, date_debut, date_fin, demi_journee, periode_demi_journee, motif, statut)
SELECT e.id, t.id, '2026-04-22', '2026-04-22', TRUE, 'matin', 'Cérémonie familiale', 'en_attente'
FROM employes e, types_absence t
WHERE e.email = 'fatou@digitalafrika.com' AND t.code = 'ABSENCE_EXCEPT'
ON CONFLICT DO NOTHING;

-- Quelques notifications de test
INSERT INTO notifications (employe_id, type, titre, message)
SELECT id, 'bienvenue', 'Bienvenue !', 'Bienvenue sur DigitalAfrika. Votre compte est actif.'
FROM employes WHERE email = 'aminata@digitalafrika.com'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (employe_id, type, titre, message)
SELECT id, 'retard', 'Retard détecté', 'Un retard de 15 minutes a été enregistré ce matin.'
FROM employes WHERE email = 'aminata@digitalafrika.com'
ON CONFLICT DO NOTHING;
