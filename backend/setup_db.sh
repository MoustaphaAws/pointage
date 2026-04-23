#!/bin/bash
# Script de configuration de la base de données PostgreSQL pour DigitalAfrika

echo "============================================================"
echo "Configuration de la base de données PostgreSQL DIGITALAFRIKA"
echo "============================================================"
echo ""
echo "Nous allons créer la base de données 'digitalafrika' et insérer les tables."
echo "Veuillez entrer le nom d'utilisateur PostgreSQL à utiliser (ex: postgres) :"
read PG_USER

echo "Vérification..."
# Création de la base si elle n'existe pas
createdb -h localhost -U $PG_USER -W digitalafrika 2>/dev/null || echo "La base 'digitalafrika' existe peut-être déjà ou vous avez annulé le mot de passe."

echo ""
echo "Exécution de schema.sql..."
psql -h localhost -U $PG_USER -W -d digitalafrika -f schema.sql

echo ""
echo "Exécution de seed.sql (données de test)..."
psql -h localhost -U $PG_USER -W -d digitalafrika -f seed.sql


echo ""
echo "✅ Terminé ! "
echo "Vous pouvez maintenant lancer le backend avec : npm run dev"
