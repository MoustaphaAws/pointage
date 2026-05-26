-- Mettre à jour le mot de passe du superadmin (bcrypt hash)
UPDATE employes 
SET password_hash = '$2b$10$U4GyvToEEpAD7VzhXF1WE.0jAJ/tGWYq2oyRrZAPAA2v3tIt77uA6'
WHERE email = 'boss@digitalafrika.com' 
AND password_hash != '$2b$10$U4GyvToEEpAD7VzhXF1WE.0jAJ/tGWYq2oyRrZAPAA2v3tIt77uA6';
