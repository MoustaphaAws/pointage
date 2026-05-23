import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { query } from "../db.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import {
  authPayloadFromRow,
  AUTH_USER_JOINS,
  AUTH_USER_SELECT,
} from "../utils/authUser.mjs";

const router = Router();

// ─── POST /api/auth/login ───
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis." });
    }

    const result = await query(
      `SELECT ${AUTH_USER_SELECT}
       ${AUTH_USER_JOINS}
       WHERE LOWER(e.email) = $1 AND e.actif = true
       LIMIT 1`,
      [String(email).toLowerCase()]
    );

    if (!result.rowCount) {
      await query(
        `INSERT INTO audit_logs (user_id, user_role, action, entite, entite_id, details, ip_address)
         VALUES (NULL, NULL, 'LOGIN_FAILED', 'AUTH', NULL, $1, $2)`,
        [JSON.stringify({ email: String(email).toLowerCase(), reason: "user_not_found_or_inactive" }), req.ip || null]
      );
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await query(
        `INSERT INTO audit_logs (user_id, user_role, action, entite, entite_id, details, ip_address)
         VALUES ($1, $2::role_enum, 'LOGIN_FAILED', 'AUTH', NULL, $3, $4)`,
        [user.id, user.role, JSON.stringify({ email: user.email, reason: "invalid_password" }), req.ip || null]
      );
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    res.json(authPayloadFromRow(user));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ───
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Déconnexion réussie." });
});

// ─── PUT /api/auth/change-password ───
router.put("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Ancien et nouveau mot de passe requis." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const result = await query("SELECT password_hash FROM employes WHERE id = $1", [req.auth.sub]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE employes SET password_hash = $1, first_login = false WHERE id = $2",
      [hash, req.auth.sub]
    );

    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/forgot-password ───
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email requis." });

    const result = await query("SELECT id, first_name FROM employes WHERE LOWER(email) = $1 AND actif = true", [String(email).toLowerCase()]);
    
    // Pour des raisons de sécurité, on renvoie toujours le même message
    if (result.rowCount > 0) {
      const user = result.rows[0];
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 heure
      
      await query(
        "UPDATE employes SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
        [token, expires, user.id]
      );
      
      // En production : envoyer un vrai email
      console.log(`[EMAIL MOCK] Lien de réinitialisation pour ${email} : http://localhost:5173/reset-password?token=${token}`);
    }

    res.json({ message: "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé." });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/reset-password ───
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token et nouveau mot de passe requis." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const result = await query(
      "SELECT id FROM employes WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );

    if (!result.rowCount) {
      return res.status(400).json({ message: "Token invalide ou expiré." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE employes SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hash, result.rows[0].id]
    );

    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    next(err);
  }
});

export default router;
