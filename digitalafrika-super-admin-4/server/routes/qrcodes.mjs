import { Router } from "express";
import crypto from "crypto";
import { query } from "../db.mjs";
import { requireAuth } from "../middleware/auth.mjs";

const router = Router();

router.get("/today", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "superadmin" && req.auth.role !== "admin") {
      return res.status(403).json({ message: "Accès réservé aux administrateurs." });
    }

    const today = new Date().toISOString().slice(0, 10);
    
    let result = await query(
      "SELECT * FROM qr_tokens WHERE date = $1 AND actif = true ORDER BY created_at",
      [today]
    );

    if (result.rowCount < 2) {
      await query("UPDATE qr_tokens SET actif = false WHERE date != $1", [today]);

      const morningToken = crypto.randomBytes(32).toString("hex");
      const eveningToken = crypto.randomBytes(32).toString("hex");

      await query(
        `INSERT INTO qr_tokens (token, date, expires_at, genere_par, actif)
         VALUES ($1, $2, $3, $4, true), ($5, $2, $3, $4, true)`,
        [morningToken, today, new Date(today + "T23:59:59").toISOString(), req.auth.sub, eveningToken]
      );

      result = await query(
        "SELECT * FROM qr_tokens WHERE date = $1 AND actif = true ORDER BY created_at",
        [today]
      );
    }

    res.json({
      date: today,
      morning: { id: result.rows[0].id, token: result.rows[0].token, type: "entrée", expiresAt: result.rows[0].expires_at },
      evening: { id: result.rows[1].id, token: result.rows[1].token, type: "sortie", expiresAt: result.rows[1].expires_at },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
