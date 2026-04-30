import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";

const router = Router();

async function assertAdminScopeByEmployee(req, employeeId) {
  // All admins can view all employees' sanctions
  return true;
}

async function assertAdminScopeBySanction(req, sanctionId) {
  // All admins can manage all sanctions
  return true;
}

async function logDenied(req, details) {
  const actor = await getActor(req);
  if (!actor) return;
  await writeAuditLog({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "ACCESS_DENIED",
    target: "SANCTION",
    details,
    ip: req.ip,
  });
}

// ─── GET /api/sanctions/me ─── (Employé)
router.get("/me", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, e.first_name, e.last_name
       FROM sanctions s
       JOIN employes e ON e.id = s.employe_id
       WHERE s.employe_id = $1
       ORDER BY s.created_at DESC`,
      [req.auth.sub]
    );
    res.json(result.rows.map(formatSanction));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sanctions/all ─── (Admin)
router.get("/all", requireAdmin, async (req, res, next) => {
  try {
    const { service } = req.query;
    let sql = `SELECT s.*, e.first_name, e.last_name, e.service_id
               FROM sanctions s
               JOIN employes e ON e.id = s.employe_id
               WHERE 1=1`;
    const params = [];

    // All admins see all sanctions (no service restriction)
    if (service) { params.push(service); sql += ` AND e.service_id = $${params.length}`; }
    sql += " ORDER BY s.created_at DESC";

    const result = await query(sql, params);
    res.json(result.rows.map(formatSanction));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sanctions/employee/:id ─── (Admin)
router.get("/employee/:id", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeByEmployee(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Consultation sanctions hors périmètre employé ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      `SELECT s.*, e.first_name, e.last_name
       FROM sanctions s
       JOIN employes e ON e.id = s.employe_id
       WHERE s.employe_id = $1
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows.map(formatSanction));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/sanctions/:id/traiter ─── (Admin)
router.put("/:id/traiter", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeBySanction(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Traitement sanction hors périmètre ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const { commentaire } = req.body || {};
    const result = await query(
      `UPDATE sanctions SET statut = 'traite', traite_par = $1, date_traitement = NOW(), commentaire_admin = $2
       WHERE id = $3 AND statut = 'alerte'
       RETURNING *`,
      [req.auth.sub, commentaire || null, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(400).json({ message: "Sanction introuvable ou déjà traitée." });
    }
    res.json({ message: "Sanction traitée." });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "HANDLE_SANCTION",
        target: req.params.id,
        details: `Sanction traitée (${commentaire || "sans commentaire"})`,
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════
// GÉNÉRATION AUTOMATIQUE DES SANCTIONS
// Appelé manuellement ou par cron en production
// ════════════════════════════════════════════
router.post("/generate", requireAdmin, async (req, res, next) => {
  try {
    const moisRef = new Date();
    moisRef.setDate(1);
    const moisStr = moisRef.toISOString().split("T")[0];
    const startOfMonth = `${moisRef.getFullYear()}-${String(moisRef.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = new Date(moisRef.getFullYear(), moisRef.getMonth() + 1, 0).toISOString().split("T")[0];

    // Charger les seuils de configuration
    const configResult = await query(
      "SELECT cle, valeur FROM configurations WHERE cle IN ('seuil_rappel_retards','seuil_avertissement','seuil_sanction','seuil_absence_avert','seuil_absence_sanction')"
    );
    const config = {};
    for (const r of configResult.rows) config[r.cle] = parseInt(r.valeur);
    const seuilRappel = config.seuil_rappel_retards || 3;
    const seuilAvert = config.seuil_avertissement || 5;
    const seuilSanction = config.seuil_sanction || 6;
    const seuilAbsAvert = config.seuil_absence_avert || 1;
    const seuilAbsSanction = config.seuil_absence_sanction || 2;

    // Compter les retards par employé ce mois-ci
    const retardsResult = await query(
      `SELECT employe_id, COUNT(*)::int AS nb
       FROM pointages
       WHERE statut = 'retard' AND date >= $1 AND date <= $2
       GROUP BY employe_id`,
      [startOfMonth, endOfMonth]
    );

    // Compter les absences injustifiées
    const absResult = await query(
      `SELECT a.employe_id, COUNT(*)::int AS nb
       FROM absences a
       JOIN types_absence t ON t.id = a.type_absence_id
       WHERE t.code = 'ABSENCE_INJUST' AND a.date_debut >= $1 AND a.date_fin <= $2
       GROUP BY a.employe_id`,
      [startOfMonth, endOfMonth]
    );

    let created = 0;

    for (const r of retardsResult.rows) {
      let typeSanction = null;
      if (r.nb >= seuilSanction) typeSanction = "sanction_disciplinaire";
      else if (r.nb >= seuilAvert) typeSanction = "avertissement";
      else if (r.nb >= seuilRappel) typeSanction = "rappel_verbal";

      if (typeSanction) {
        // Vérifier si déjà créée ce mois
        const existing = await query(
          "SELECT id FROM sanctions WHERE employe_id = $1 AND mois_reference = $2 AND nb_retards = $3",
          [r.employe_id, moisStr, r.nb]
        );
        if (!existing.rowCount) {
          await query(
            `INSERT INTO sanctions (employe_id, type_sanction, motif, nb_retards, mois_reference)
             VALUES ($1, $2, $3, $4, $5)`,
            [r.employe_id, typeSanction, `${r.nb} retards en ${moisRef.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, r.nb, moisStr]
          );
          // Notification
          await query(
            `INSERT INTO notifications (employe_id, type, titre, message)
             VALUES ($1, 'sanction', 'Alerte disciplinaire', $2)`,
            [r.employe_id, `${typeSanction.replace("_", " ")} : ${r.nb} retards ce mois.`]
          );
          created++;
        }
      }
    }

    for (const a of absResult.rows) {
      let typeSanction = null;
      if (a.nb >= seuilAbsSanction) typeSanction = "sanction_disciplinaire";
      else if (a.nb >= seuilAbsAvert) typeSanction = "avertissement";

      if (typeSanction) {
        const existing = await query(
          "SELECT id FROM sanctions WHERE employe_id = $1 AND mois_reference = $2 AND nb_absences_injust = $3",
          [a.employe_id, moisStr, a.nb]
        );
        if (!existing.rowCount) {
          await query(
            `INSERT INTO sanctions (employe_id, type_sanction, motif, nb_absences_injust, mois_reference)
             VALUES ($1, $2, $3, $4, $5)`,
            [a.employe_id, typeSanction, `${a.nb} absences injustifiées ce mois`, a.nb, moisStr]
          );
          await query(
            `INSERT INTO notifications (employe_id, type, titre, message)
             VALUES ($1, 'sanction', 'Alerte disciplinaire', $2)`,
            [a.employe_id, `${typeSanction.replace("_", " ")} : ${a.nb} absences injustifiées.`]
          );
          created++;
        }
      }
    }

    res.json({ message: `${created} sanctions générées.` });
  } catch (err) {
    next(err);
  }
});

// ─── Helper ───
function formatSanction(s) {
  return {
    id: s.id,
    employeeId: s.employe_id,
    employeeName: s.first_name ? `${s.first_name} ${s.last_name}` : null,
    typeSanction: s.type_sanction,
    motif: s.motif,
    nbRetards: s.nb_retards,
    nbAbsencesInjust: s.nb_absences_injust,
    statut: s.statut,
    traitePar: s.traite_par,
    dateTraitement: s.date_traitement,
    commentaireAdmin: s.commentaire_admin,
    moisReference: s.mois_reference,
    createdAt: s.created_at,
  };
}

export default router;
