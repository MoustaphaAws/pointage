import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ─── GET /api/jours-feries ───
router.get("/", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM jours_feries ORDER BY date");
    res.json(result.rows.map((j) => ({
      id: j.id, date: j.date, libelle: j.libelle, recurrent: j.recurrent,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/jours-feries ─── (Admin)
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { date, libelle, recurrent } = req.body || {};
    if (!date || !libelle) return res.status(400).json({ message: "Date et libellé requis." });
    const result = await query(
      "INSERT INTO jours_feries (date, libelle, recurrent, created_by) VALUES ($1,$2,$3,$4) RETURNING *",
      [date, libelle, recurrent || false, req.auth.sub]
    );
    const j = result.rows[0];
    res.status(201).json({ id: j.id, date: j.date, libelle: j.libelle, recurrent: j.recurrent });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/jours-feries/:id ─── (Admin)
router.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { date, libelle, recurrent } = req.body || {};
    const result = await query(
      `UPDATE jours_feries SET date = COALESCE($1, date), libelle = COALESCE($2, libelle), recurrent = COALESCE($3, recurrent)
       WHERE id = $4 RETURNING *`,
      [date || null, libelle || null, recurrent !== undefined ? recurrent : null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Jour férié introuvable." });
    const j = result.rows[0];
    res.json({ id: j.id, date: j.date, libelle: j.libelle, recurrent: j.recurrent });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/jours-feries/:id ─── (Admin)
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    await query("DELETE FROM jours_feries WHERE id = $1", [req.params.id]);
    res.json({ message: "Jour férié supprimé." });
  } catch (err) {
    next(err);
  }
});

export default router;
