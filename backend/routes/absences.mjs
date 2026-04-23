import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ─── POST /api/absences ─── (Employé: déclarer)
router.post("/", async (req, res, next) => {
  try {
    const { typeAbsenceId, dateDebut, dateFin, demiJournee, periodeDemiJournee, motif } = req.body || {};
    if (!typeAbsenceId || !dateDebut || !dateFin) {
      return res.status(400).json({ message: "Type, date début et date fin requis." });
    }

    const result = await query(
      `INSERT INTO absences (employe_id, type_absence_id, date_debut, date_fin, demi_journee, periode_demi_journee, motif)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.auth.sub, typeAbsenceId, dateDebut, dateFin, demiJournee || false, periodeDemiJournee || null, motif || null]
    );
    const a = result.rows[0];

    // Enrichir avec le type d'absence
    const typeResult = await query("SELECT libelle FROM types_absence WHERE id = $1", [typeAbsenceId]);
    const empResult = await query("SELECT first_name, last_name FROM employes WHERE id = $1", [req.auth.sub]);

    res.status(201).json(formatAbsence(a, typeResult.rows[0]?.libelle, empResult.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/absences/me ─── (Employé: mes absences)
router.get("/me", async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*, t.libelle AS type_label, e.first_name, e.last_name, j.fichier_url as justificatif_url
               FROM absences a
               JOIN types_absence t ON t.id = a.type_absence_id
               JOIN employes e ON e.id = a.employe_id
               LEFT JOIN justificatifs j ON j.absence_id = a.id
               WHERE a.employe_id = $1`;
    const params = [req.auth.sub];
    if (status) { params.push(status); sql += ` AND a.statut = $${params.length}`; }
    sql += " ORDER BY a.created_at DESC";

    const result = await query(sql, params);
    res.json(result.rows.map((a) => formatAbsence(a, a.type_label, a)));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/absences/:id/cancel ─── (Employé: annuler)
router.put("/:id/cancel", async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE absences SET statut = 'annulee'
       WHERE id = $1 AND employe_id = $2 AND statut = 'en_attente'
       RETURNING *`,
      [req.params.id, req.auth.sub]
    );
    if (!result.rowCount) {
      return res.status(400).json({ message: "Impossible d'annuler. Demande introuvable ou déjà traitée." });
    }

    // Notification
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'absence_annulee', 'Absence annulée', 'Votre demande d''absence a été annulée.')`,
      [req.auth.sub]
    );

    res.json({ message: "Absence annulée." });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/absences/all ─── (Admin: toutes les absences)
router.get("/all", requireAdmin, async (req, res, next) => {
  try {
    const { service, status } = req.query;
    let sql = `SELECT a.*, t.libelle AS type_label, e.first_name, e.last_name, e.email, e.service_id, j.fichier_url as justificatif_url
               FROM absences a
               JOIN types_absence t ON t.id = a.type_absence_id
               JOIN employes e ON e.id = a.employe_id
               LEFT JOIN justificatifs j ON j.absence_id = a.id
               WHERE 1=1`;
    const params = [];

    // Périmètre admin
    if (req.auth.role === "admin") {
      params.push(req.auth.serviceId);
      sql += ` AND e.service_id = $${params.length}`;
    }
    if (service) { params.push(service); sql += ` AND e.service_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND a.statut = $${params.length}`; }
    sql += " ORDER BY a.created_at DESC";

    const result = await query(sql, params);
    res.json(result.rows.map((a) => formatAbsence(a, a.type_label, a)));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/absences/:id/approve ─── (Admin)
router.put("/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE absences SET statut = 'approuvee', valide_par = $1, date_validation = NOW()
       WHERE id = $2 AND statut = 'en_attente'
       RETURNING *`,
      [req.auth.sub, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(400).json({ message: "Demande introuvable ou déjà traitée." });
    }

    const absence = result.rows[0];
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'absence_validee', 'Absence approuvée', $2)`,
      [absence.employe_id, `Votre demande d'absence du ${absence.date_debut} au ${absence.date_fin} a été approuvée.`]
    );

    res.json({ message: "Absence approuvée." });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/absences/:id/reject ─── (Admin)
router.put("/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const { motifRejet } = req.body || {};
    if (!motifRejet) {
      return res.status(400).json({ message: "Motif de rejet requis." });
    }
    const result = await query(
      `UPDATE absences SET statut = 'rejetee', valide_par = $1, date_validation = NOW(), motif_rejet = $2
       WHERE id = $3 AND statut = 'en_attente'
       RETURNING *`,
      [req.auth.sub, motifRejet, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(400).json({ message: "Demande introuvable ou déjà traitée." });
    }

    const absence = result.rows[0];
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'absence_rejetee', 'Absence rejetée', $2)`,
      [absence.employe_id, `Votre demande d'absence a été rejetée. Motif : ${motifRejet}`]
    );

    res.json({ message: "Absence rejetée." });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/absences/employee/:id ─── (Admin)
router.get("/employee/:id", requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, t.libelle AS type_label, e.first_name, e.last_name, j.fichier_url as justificatif_url
       FROM absences a
       JOIN types_absence t ON t.id = a.type_absence_id
       JOIN employes e ON e.id = a.employe_id
       LEFT JOIN justificatifs j ON j.absence_id = a.id
       WHERE a.employe_id = $1
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows.map((a) => formatAbsence(a, a.type_label, a)));
  } catch (err) {
    next(err);
  }
});

// ─── Helper ───
function formatAbsence(a, typeLabel, emp) {
  return {
    id: a.id,
    employeeId: a.employe_id,
    employeeName: emp ? `${emp.first_name} ${emp.last_name}` : null,
    employeeEmail: emp?.email || null,
    typeAbsenceId: a.type_absence_id,
    typeAbsenceLabel: typeLabel || "",
    dateDebut: a.date_debut,
    dateFin: a.date_fin,
    demiJournee: a.demi_journee,
    periodeDemiJournee: a.periode_demi_journee,
    motif: a.motif,
    statut: a.statut,
    motifRejet: a.motif_rejet,
    justificatifUrl: a.justificatif_url || null,
    validePar: a.valide_par,
    dateValidation: a.date_validation,
    createdAt: a.created_at,
  };
}

export default router;
