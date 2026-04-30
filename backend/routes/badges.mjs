import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";

const router = Router();

async function assertAdminScopeByEmployee(req, employeeId) {
  if (req.auth.role !== "admin") return true;
  const scope = await query("SELECT service_id FROM employes WHERE id = $1", [employeeId]);
  if (!scope.rowCount) return false;
  return scope.rows[0].service_id === req.auth.serviceId;
}

async function logDenied(req, details) {
  const actor = await getActor(req);
  if (!actor) return;
  await writeAuditLog({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "ACCESS_DENIED",
    target: "BADGE",
    details,
    ip: req.ip,
  });
}

// ─── GET /api/badges ───
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const params = [];
    let sql = `SELECT e.uid_badge AS uid, e.id AS employe_id,
                      e.first_name || ' ' || e.last_name AS employe_name,
                      e.badge_actif AS actif
               FROM employes e
               WHERE e.uid_badge IS NOT NULL`;
    if (req.auth.role === "admin") {
      params.push(req.auth.serviceId);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " ORDER BY e.last_name";
    const result = await query(sql, params);
    res.json(result.rows.map((r) => ({
      uid: r.uid,
      employeeId: r.employe_id,
      employeeName: r.employe_name,
      actif: r.actif,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/employees/:id/badge ───
router.put("/employees/:id/badge", requireAdmin, async (req, res, next) => {
  try {
    const { uidBadge } = req.body || {};
    if (!uidBadge) return res.status(400).json({ message: "UID badge requis." });
    const inScope = await assertAdminScopeByEmployee(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Assignation badge hors périmètre employé ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      "UPDATE employes SET uid_badge = $1, badge_actif = true WHERE id = $2 RETURNING id",
      [uidBadge, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé introuvable." });
    res.json({ message: "Badge assigné." });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "ASSIGN_BADGE",
        target: req.params.id,
        details: `Badge assigné (${uidBadge})`,
        ip: req.ip,
      });
    }
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Ce badge est déjà assigné." });
    next(err);
  }
});

// ─── PUT /api/badges/:uid/deactivate ───
router.put("/:uid/deactivate", requireAdmin, async (req, res, next) => {
  try {
    const emp = await query("SELECT id FROM employes WHERE uid_badge = $1", [req.params.uid]);
    if (!emp.rowCount) return res.status(404).json({ message: "Badge introuvable." });
    const inScope = await assertAdminScopeByEmployee(req, emp.rows[0].id);
    if (!inScope) {
      await logDenied(req, `Désactivation badge hors périmètre UID ${req.params.uid}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    await query("UPDATE employes SET badge_actif = false WHERE uid_badge = $1", [req.params.uid]);
    res.json({ uid: req.params.uid, actif: false });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "DEACTIVATE_BADGE",
        target: req.params.uid,
        details: "Badge désactivé",
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
