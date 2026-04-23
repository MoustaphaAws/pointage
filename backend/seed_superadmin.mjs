import "dotenv/config";
import bcrypt from "bcrypt";
import { query } from "./db.mjs";

async function seedSuperAdmin() {
  try {
    // Vérifier si le SuperAdmin existe déjà
    const check = await query("SELECT id FROM employes WHERE email = 'boss@digitalafrika.com'");
    if (check.rowCount) {
      console.log("✅ SuperAdmin existe déjà (boss@digitalafrika.com)");
      process.exit(0);
    }

    // Trouver le service Direction
    const srvResult = await query("SELECT id FROM services WHERE nom = 'Direction'");
    if (!srvResult.rowCount) {
      console.error("❌ Service 'Direction' introuvable. Exécutez schema.sql d'abord.");
      process.exit(1);
    }

    const serviceId = srvResult.rows[0].id;
    const hash = await bcrypt.hash("Admin@2026!", 10);

    await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, role, service_id, poste, type_contrat, date_embauche, first_login, uid_badge)
       VALUES ('DA-0000', 'Super', 'Admin', 'boss@digitalafrika.com', $1, '+221770000000', 'superadmin', $2, 'Directeur Général', 'CDI', '2022-01-01', FALSE, 'SUPER-RFID-001')`,
      [hash, serviceId]
    );

    console.log("✅ SuperAdmin créé avec succès !");
    console.log("   Email: boss@digitalafrika.com");
    console.log("   Mot de passe: Admin@2026!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

seedSuperAdmin();
