import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ─── GET /api/badges ───
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.uid_badge AS uid, e.id AS employe_id,
              e.first_name || ' ' || e.last_name AS employe_name,
              e.badge_actif AS actif
       FROM employes e
       WHERE e.uid_badge IS NOT NULL
       ORDER BY e.last_name`
    );
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
    const result = await query(
      "UPDATE employes SET uid_badge = $1, badge_actif = true WHERE id = $2 RETURNING id",
      [uidBadge, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé introuvable." });
    res.json({ message: "Badge assigné." });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Ce badge est déjà assigné." });
    next(err);
  }
});

// ─── PUT /api/badges/:uid/deactivate ───
router.put("/:uid/deactivate", requireAdmin, async (req, res, next) => {
  try {
    await query(
      "UPDATE employes SET badge_actif = false WHERE uid_badge = $1",
      [req.params.uid]
    );
    res.json({ uid: req.params.uid, actif: false });
  } catch (err) {
    next(err);
  }
});

export default router;
