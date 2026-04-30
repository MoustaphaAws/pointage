import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";
import { upload, UPLOAD_DIR } from "../middleware/upload.mjs";
import path from "path";
import { writeAuditLog, getActor } from "../utils/audit.mjs";

const router = Router();

async function assertAdminScopeByJustificatif(req, justificatifId) {
  if (req.auth.role !== "admin") return true;
  const scope = await query(
    `SELECT e.service_id
     FROM justificatifs j
     JOIN absences a ON a.id = j.absence_id
     JOIN employes e ON e.id = a.employe_id
     WHERE j.id = $1`,
    [justificatifId]
  );
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
    target: "JUSTIFICATIF",
    details,
    ip: req.ip,
  });
}

// ─── POST /api/justificatifs/upload/:absenceId ───
router.post("/upload/:absenceId", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni." });
    }
    // Vérifier que l'absence existe et appartient à l'utilisateur (ou admin)
    const absResult = await query("SELECT employe_id FROM absences WHERE id = $1", [req.params.absenceId]);
    if (!absResult.rowCount) {
      return res.status(404).json({ message: "Absence introuvable." });
    }
    if (req.auth.role === "employee" && absResult.rows[0].employe_id !== req.auth.sub) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const result = await query(
      `INSERT INTO justificatifs (absence_id, nom_fichier, chemin_fichier, type_mime, taille_octets, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.absenceId,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.auth.sub,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      nomFichier: result.rows[0].nom_fichier,
      statut: result.rows[0].statut,
      uploadedAt: result.rows[0].uploaded_at,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/justificatifs/:id ─── (Admin: télécharger)
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeByJustificatif(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Téléchargement justificatif hors périmètre ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query("SELECT * FROM justificatifs WHERE id = $1", [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Justificatif introuvable." });
    }
    const j = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, j.chemin_fichier);
    res.download(filePath, j.nom_fichier);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/justificatifs/:id/validate ─── (Admin)
router.put("/:id/validate", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeByJustificatif(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Validation justificatif hors périmètre ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      `UPDATE justificatifs SET statut = 'valide', valide_par = $1, date_validation = NOW()
       WHERE id = $2 RETURNING *`,
      [req.auth.sub, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Justificatif introuvable." });
    }
    res.json({ id: req.params.id, statut: "valide" });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "VALIDATE_JUSTIFICATIF",
        target: req.params.id,
        details: "Justificatif validé",
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/justificatifs/:id/reject ─── (Admin)
router.put("/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeByJustificatif(req, req.params.id);
    if (!inScope) {
      await logDenied(req, `Rejet justificatif hors périmètre ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const { motifRejet } = req.body || {};
    const result = await query(
      `UPDATE justificatifs SET statut = 'rejete', valide_par = $1, date_validation = NOW(), motif_rejet = $2
       WHERE id = $3 RETURNING *`,
      [req.auth.sub, motifRejet || "Rejeté", req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Justificatif introuvable." });
    }
    res.json({ id: req.params.id, statut: "rejete", motifRejet: motifRejet || "Rejeté" });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "REJECT_JUSTIFICATIF",
        target: req.params.id,
        details: `Justificatif rejeté (${motifRejet || "Rejeté"})`,
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
