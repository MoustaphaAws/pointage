import { query } from "./backend/db.mjs";
async function test() {
  const r = await query("SELECT id FROM employes LIMIT 1");
  const mod_id = r.rows[0].id;
  await query("INSERT INTO configurations (cle, valeur, modifie_par, description) VALUES ('company_logo', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', $1, 'Logo entreprise') ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur", [mod_id]);
  console.log("Logo inserted.");
}
test().catch(console.error).then(() => process.exit(0));
