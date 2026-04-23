import { Router } from "express";
import { query } from "../db.mjs";

const router = Router();

// ─── GET /api/notifications ───
router.get("/", async (req, res, next) => {
  try {
    const readFilter = req.query.read;
    let sql = "SELECT * FROM notifications WHERE employe_id = $1";
    const params = [req.auth.sub];
    if (readFilter === "false") {
      sql += " AND lue = false";
    }
    sql += " ORDER BY created_at DESC LIMIT 50";

    const result = await query(sql, params);
    res.json(result.rows.map((n) => ({
      id: n.id,
      type: n.type,
      titre: n.titre,
      message: n.message,
      lue: n.lue,
      createdAt: n.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/notifications/:id/read ───
router.put("/:id/read", async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET lue = true WHERE id = $1 AND employe_id = $2",
      [req.params.id, req.auth.sub]
    );
    res.json({ id: req.params.id, lue: true });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/notifications/read-all ───
router.put("/read-all", async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE notifications SET lue = true WHERE employe_id = $1 AND lue = false",
      [req.auth.sub]
    );
    res.json({ message: "Toutes les notifications marquées comme lues.", count: result.rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
