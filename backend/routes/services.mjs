import { Router } from "express";
import { query } from "../db.mjs";

const router = Router();

// ─── GET /api/services ───
router.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT s.id, s.nom, s.description, s.actif,
              COUNT(e.id)::int AS nombre_employes
       FROM services s
       LEFT JOIN employes e ON e.service_id = s.id AND e.actif = true
       WHERE s.actif = true
       GROUP BY s.id
       ORDER BY s.nom`
    );
    res.json(result.rows.map((s) => ({
      id: s.id,
      nom: s.nom,
      description: s.description,
      nombreEmployes: s.nombre_employes,
      actif: s.actif,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
