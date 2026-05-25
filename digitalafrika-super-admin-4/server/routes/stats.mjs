import { Router } from "express";
import { query } from "../db.mjs";

const router = Router();

async function getEntrepriseScope(req) {
  if (req.auth.role === "superadmin") return null;
  const r = await query("SELECT entreprise_id FROM employes WHERE id = $1", [req.auth.sub]);
  return r.rows[0]?.entreprise_id ?? null;
}

function scopeClause(alias, entrepriseId, params) {
  if (!entrepriseId) return "";
  params.push(entrepriseId);
  return ` AND ${alias}.entreprise_id = $${params.length}`;
}

router.get("/global", async (req, res, next) => {
  try {
    const entrepriseId = await getEntrepriseScope(req);
    const ep = [];
    const escope = scopeClause("e", entrepriseId, ep);

    const [employees, admins, activeUsers] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM employes e WHERE role = 'employee'${escope}`, ep),
      query(`SELECT COUNT(*)::int AS total FROM employes e WHERE role = 'admin'${escope}`, ep),
      query(`SELECT COUNT(*)::int AS total FROM employes e WHERE actif = true AND role != 'superadmin'${escope}`, ep),
    ]);

    res.json({
      employees: employees.rows[0].total,
      admins: admins.rows[0].total,
      activeUsers: activeUsers.rows[0].total,
      absenteeismRate: 0,
      pendingAbsences: 0,
      lateArrivalsCount: 0,
      monthlyOvertimeHours: 0,
      estimatedOvertimeCost: 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
