import { query } from "../db.mjs";

export async function writeAuditLog({ userId, userName, role, action, target, details, ip }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_role, action, entite, entite_id, details, ip_address)
       VALUES ($1, $2, $3, $4, NULL, $5, $6)`,
      [userId, role, action, target, JSON.stringify({ user_name: userName, details }), ip || null]
    );
  } catch (err) {
    console.error("Erreur AuditLog:", err);
  }
}

export async function getActor(req) {
  if (!req.auth || !req.auth.sub) return null;
  const result = await query("SELECT id, first_name, last_name, role FROM employes WHERE id = $1", [req.auth.sub]);
  if (!result.rowCount) return null;
  const r = result.rows[0];
  return { id: r.id, name: `${r.first_name} ${r.last_name}`, role: r.role };
}
