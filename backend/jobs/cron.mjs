import cron from "node-cron";
import { query } from "../db.mjs";

export function initCronJobs() {
  // Lancer le cron tous les jours à 23h30 (du lundi au vendredi)
  cron.schedule("30 23 * * 1-5", async () => {
    console.log("🕒 [CRON] Début de la vérification quotidienne des absences...");
    try {
      // 1. Trouver les employés actifs, non-superadmin, qui :
      // - N'ont pas pointé aujourd'hui
      // - Ne sont pas en congé/absence approuvée ou en attente
      const insertResult = await query(`
        WITH active_employes AS (
            SELECT id, first_name, last_name, service_id
            FROM employes 
            WHERE actif = true AND role != 'superadmin'
        ),
        employes_presents AS (
            SELECT employe_id 
            FROM pointages 
            WHERE date = CURRENT_DATE AND heure_arrivee IS NOT NULL
        ),
        employes_en_conge AS (
            SELECT employe_id 
            FROM absences 
            WHERE CURRENT_DATE >= date_debut AND CURRENT_DATE <= date_fin 
              AND statut IN ('approuvee', 'en_attente')
        )
        SELECT e.id
        FROM active_employes e
        LEFT JOIN employes_presents p ON e.id = p.employe_id
        LEFT JOIN employes_en_conge c ON e.id = c.employe_id
        WHERE p.employe_id IS NULL AND c.employe_id IS NULL
      `);
      
      const absentIds = insertResult.rows.map(r => r.id);
      if (absentIds.length === 0) {
        console.log("✅ [CRON] Aucun absent non justifié détecté aujourd'hui.");
        return;
      }
      
      console.log(`⚠️ [CRON] ${absentIds.length} absent(s) détecté(s).`);
      
      for (const empId of absentIds) {
        // Enregistrer l'absence dans le pointage
        await query(`
          INSERT INTO pointages (employe_id, date, statut)
          VALUES ($1, CURRENT_DATE, 'absent')
          ON CONFLICT (employe_id, date) DO UPDATE SET statut = 'absent'
        `, [empId]);
        
        // Créer une notification pour l'employé
        await query(`
          INSERT INTO notifications (employe_id, type, titre, message)
          VALUES ($1, 'system', 'Absence enregistrée', 'Vous avez été marqué comme absent aujourd''hui. Veuillez soumettre un justificatif si nécessaire.')
        `, [empId]);
      }
      
      console.log("✅ [CRON] Traitement des absences terminé avec succès.");
      
    } catch (error) {
      console.error("❌ [CRON] Erreur lors de la vérification des absences:", error);
    }
  });

  console.log("✅ Service de CRON (absences) initialisé");
}
