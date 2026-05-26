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

async function reset() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  if (!email || !newPassword) {
    console.log("Usage: node reset_password.mjs <email> <nouveau_mot_de_passe>");
    process.exit(1);
  }
  
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE employes SET password_hash = $1 WHERE email = $2", [hash, email]);
  console.log(`✅ Mot de passe réinitialisé pour ${email}: ${newPassword}`);
  await pool.end();
}

reset();
