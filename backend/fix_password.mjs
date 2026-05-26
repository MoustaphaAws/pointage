import bcrypt from "bcrypt";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "digitalafrika",
});

async function fixPassword() {
  try {
    const hash = await bcrypt.hash("Admin@2026!", 10);
    
    const result = await pool.query(
      "UPDATE employes SET password_hash = $1 WHERE email = 'boss@digitalafrika.com' RETURNING id, email, role",
      [hash]
    );
    
    console.log("✅ Mot de passe mis à jour :", result.rows[0]);
    console.log("   Hash :", hash);
  } catch (err) {
    console.error("❌ Erreur :", err);
  } finally {
    await pool.end();
  }
}

fixPassword();
