import "dotenv/config";
import bcrypt from "bcrypt";
import { query } from "./db.mjs";

async function seedSuperAdmin() {
  try {
    // Vérifier si le SuperAdmin existe déjà
    const check = await query("SELECT id FROM employes WHERE email = 'boss@digitalafrika.com'");
    if (check.rowCount) {
      // Mettre à jour le mot de passe pour être sûr qu'il correspond
      const hash = await bcrypt.hash("Admin@2026!", 10);
      await query(
        "UPDATE employes SET password_hash = $1, service_id = (SELECT id FROM services WHERE nom = 'Direction' LIMIT 1) WHERE email = 'boss@digitalafrika.com'",
        [hash]
      );
      console.log("✅ SuperAdmin mis à jour (boss@digitalafrika.com / Admin@2026!)");
      process.exit(0);
    }

    // Trouver ou créer le service Direction
    let srvResult = await query("SELECT id FROM services WHERE nom = 'Direction'");
    if (!srvResult.rowCount) {
      await query("INSERT INTO services (nom) VALUES ('Direction') ON CONFLICT (nom) DO NOTHING");
      srvResult = await query("SELECT id FROM services WHERE nom = 'Direction'");
    }

    const serviceId = srvResult.rows[0].id;
    const hash = await bcrypt.hash("Admin@2026!", 10);

    await query(
      `INSERT INTO employes (first_name, last_name, email, password_hash, role, service_id, poste, service, actif)
       VALUES ('Super', 'Admin', 'boss@digitalafrika.com', $1, 'superadmin', $2, 'Directeur Général', 'Direction', true)`,
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