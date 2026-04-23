import { Router } from "express";
import { query } from "../db.mjs";

const router = Router();

// ─── GET /api/profile/me ───
router.get("/me", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*, s.nom AS service_name
       FROM employes e
       JOIN services s ON s.id = e.service_id
       WHERE e.id = $1`,
      [req.auth.sub]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Profil introuvable." });
    }
    const u = result.rows[0];
    res.json({
      id: u.id,
      matricule: u.matricule,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      photoUrl: u.photo_url,
      role: u.role,
      serviceId: u.service_id,
      serviceName: u.service_name,
      poste: u.poste,
      typeContrat: u.type_contrat,
      heureDebut: u.heure_debut?.slice(0, 5),
      heureFin: u.heure_fin?.slice(0, 5),
      dateEmbauche: u.date_embauche,
      dateFinContrat: u.date_fin_contrat,
      actif: u.actif,
      firstLogin: u.first_login,
      uidBadge: u.uid_badge,
      badgeActif: u.badge_actif,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/profile/me ───
router.put("/me", async (req, res, next) => {
  try {
    const { phone, address } = req.body || {};
    await query(
      "UPDATE employes SET phone = COALESCE($1, phone), address = COALESCE($2, address) WHERE id = $3",
      [phone || null, address || null, req.auth.sub]
    );
    res.json({ message: "Profil mis à jour." });
  } catch (err) {
    next(err);
  }
});

export default router;
