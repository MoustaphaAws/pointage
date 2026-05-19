import { Router } from "express";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import { query } from "../db.mjs";
import { requireSuperAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";
import { generateReportPDF } from "../utils/pdfHelper.mjs";
import { formatTimeHHMM } from "../utils/formatDbTime.mjs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeJsonbObject(val) {
  if (val == null) return {};
  if (typeof val === "object" && !Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function timeFieldToMinutes(t) {
  if (t == null) return null;
  const s = String(t).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function asDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePgDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const s = String(val).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function effectiveWorkMinutes(p, heureFinEmp) {
  const stored = Number(p.duree_travail_minutes ?? 0);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const arr = asDate(p.heure_arrivee);
  const dep = asDate(p.heure_depart);
  if (arr && dep && dep >= arr) {
    return Math.floor((dep.getTime() - arr.getTime()) / 60000);
  }

  const finM = timeFieldToMinutes(heureFinEmp);
  if (arr && finM != null && !dep) {
    const day = parsePgDateOnly(p.date);
    if (day) {
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(finM / 60), finM % 60, 0, 0);
      if (end > arr) return Math.floor((end.getTime() - arr.getTime()) / 60000);
    }
  }
  return 0;
}

function pointageDisplayType(p) {
  const s = String(p.statut || "").toLowerCase();
  if (s === "retard" || Number(p.retard_minutes || 0) > 0) return "retard";
  return "present";
}

const router = Router();

router.use(requireSuperAdmin);

// ═══════════════════════════════════════════════
// PROFIL SUPERADMIN (me)
// ═══════════════════════════════════════════════

router.get("/me", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.role,
              COALESCE(s.nom, '') AS service, e.poste, e.actif AS active,
              e.uid_badge AS badge_uid, e.created_at
       FROM employes e
       LEFT JOIN services s ON s.id = e.service_id
       WHERE e.id = $1`,
      [req.auth.sub]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Profil SuperAdmin introuvable." });
    }
    const u = result.rows[0];
    res.json({
      id: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      role: u.role,
      service: u.service,
      poste: u.poste || "",
      active: u.active,
      badgeUid: u.badge_uid || "-",
      createdAt: u.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/me", async (req, res, next) => {
  try {
    const { firstName, lastName, email, service, poste, password } = req.body || {};

    let serviceId = null;
    if (service) {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
      if (srvResult.rowCount) {
        serviceId = srvResult.rows[0].id;
      }
    }

    let hashClause = "";
    const values = [
      firstName || null,
      lastName || null,
      email ? String(email).toLowerCase() : null,
      serviceId,
      poste || null,
      req.auth.sub,
    ];

    if (password && String(password).length >= 4) {
      const hash = await bcrypt.hash(String(password), 10);
      values.push(hash);
      hashClause = `, password_hash = $${values.length}`;
    }

    const result = await query(
      `UPDATE employes SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         service_id = COALESCE($4, service_id),
         poste = COALESCE($5, poste)
         ${hashClause}
       WHERE id = $6
       RETURNING *`,
      values
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Profil introuvable." });
    }

    const u = result.rows[0];
    const srvName = await query("SELECT nom FROM services WHERE id = $1", [u.service_id]);

    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "UPDATE_PROFILE", target: "SUPERADMIN",
        details: "Mise à jour du profil SuperAdmin", ip: req.ip,
      });
    }

    res.json({
      id: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      role: u.role,
      service: srvName.rows[0]?.nom || "",
      poste: u.poste || "",
      active: u.actif,
      badgeUid: u.uid_badge || "-",
      createdAt: u.created_at,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Cet email est déjà utilisé." });
    }
    next(err);
  }
});

// ═══════════════════════════════════════════════
// GESTION DES UTILISATEURS (Admin + Employé)
// ═══════════════════════════════════════════════

router.get("/admins", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.role,
              s.nom AS service, e.poste, e.actif AS active,
              e.uid_badge AS badge_uid, e.admin_permissions, e.created_at
       FROM employes e
       JOIN services s ON s.id = e.service_id
       WHERE e.role IN ('employee', 'admin')
       ORDER BY e.created_at DESC`
    );
    res.json(result.rows.map((r) => ({
      id: String(r.id),
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      role: r.role,
      service: r.service,
      poste: r.poste || "",
      active: r.active,
      adminPermissions: r.role === "admin" ? (r.admin_permissions || {}) : undefined,
      badgeUid: r.badge_uid || "-",
      createdAt: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

router.post("/admins", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, email, role, service, poste, badgeUid, password, adminPermissions } = req.body || {};
    if (!firstName || !lastName || !email || !service || !password) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
    if (!srvResult.rowCount) {
      return res.status(400).json({ message: `Service "${service}" introuvable.` });
    }
    const serviceId = srvResult.rows[0].id;

    const safeRole = role === "admin" ? "admin" : "employee";
    const permissionsPayload = safeRole === "admin" ? (adminPermissions || {}) : {};
    const hash = await bcrypt.hash(password, 10);

    const matResult = await query("SELECT generate_matricule() AS mat");
    const matricule = matResult.rows[0].mat;

    const insert = await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, role, service_id, poste, uid_badge, actif, admin_permissions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::jsonb, $11)
       RETURNING id, first_name, last_name, email, role, poste, actif, uid_badge, admin_permissions, created_at`,
      [matricule, firstName, lastName, String(email).toLowerCase(), hash, safeRole, serviceId, poste || null, badgeUid || null, JSON.stringify(permissionsPayload), req.auth.sub]
    );
    const created = insert.rows[0];

    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'bienvenue', 'Bienvenue !', $2)`,
      [created.id, `Bienvenue chez OnTime. Votre identifiant de connexion est : ${email}`]
    );

    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "CREATE_USER", target: `${created.first_name} ${created.last_name}`,
        details: `Création compte ${safeRole}`, ip: req.ip,
      });
    }

    res.status(201).json({
      id: String(created.id),
      firstName: created.first_name,
      lastName: created.last_name,
      email: String(email).toLowerCase(),
      role: created.role,
      service,
      poste: created.poste || "",
      active: created.actif,
      adminPermissions: created.role === "admin" ? (created.admin_permissions || {}) : undefined,
      badgeUid: created.uid_badge || "-",
      createdAt: created.created_at,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Un utilisateur avec cet email ou ce badge existe déjà." });
    }
    next(err);
  }
});

router.put("/admins/:id", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, service, poste, role, badgeUid, adminPermissions } = req.body || {};
    const safeRole = role ? (role === "admin" ? "admin" : "employee") : null;

    let serviceId = null;
    if (service) {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
      if (!srvResult.rowCount) {
        return res.status(400).json({ message: `Service "${service}" introuvable.` });
      }
      serviceId = srvResult.rows[0].id;
    }

    const update = await query(
      `UPDATE employes SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         service_id = COALESCE($3, service_id),
         poste = COALESCE($4, poste),
         role = CASE WHEN $5::text IS NULL THEN role ELSE $5::role_enum END,
         uid_badge = COALESCE($6, uid_badge),
         admin_permissions = CASE
           WHEN $8::jsonb IS NULL THEN admin_permissions
           WHEN COALESCE($5::text, role::text) = 'admin' THEN $8::jsonb
           ELSE '{}'::jsonb
         END
       WHERE id = $7 AND role IN ('admin', 'employee')
       RETURNING *`,
      [
        firstName || null,
        lastName || null,
        serviceId,
        poste || null,
        safeRole,
        badgeUid || null,
        req.params.id,
        adminPermissions !== undefined ? JSON.stringify(adminPermissions) : null,
      ]
    );
    if (!update.rowCount) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const updated = update.rows[0];
    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "UPDATE_USER", target: `${updated.first_name} ${updated.last_name}`,
        details: "Mise à jour profil employé/admin", ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/employees/:id", async (req, res, next) => {
  try {
    const employeeId = String(req.params.id || "").trim();
    if (!employeeId) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    if (!UUID_RE.test(employeeId)) {
      return res.status(400).json({ message: "Identifiant employé invalide." });
    }

    const profileResult = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.role,
              s.nom AS service, e.poste, e.actif AS active,
              e.admin_permissions, e.created_at,
              e.heure_debut, e.heure_fin
       FROM employes e
       JOIN services s ON s.id = e.service_id
       WHERE e.id = $1::uuid AND e.role IN ('employee', 'admin')
       LIMIT 1`,
      [employeeId]
    );
    if (!profileResult.rowCount) {
      return res.status(404).json({ message: "Employé introuvable." });
    }

    const row = profileResult.rows[0];
    const adminPerms = row.role === "admin" ? normalizeJsonbObject(row.admin_permissions) : undefined;

    const emptyRows = () => ({ rows: [], rowCount: 0 });
    const unwrapQuery = (label, result) => {
      if (result.status === "fulfilled") return result.value;
      console.error(`GET /admin/employees/:id — ${label}:`, result.reason?.message || result.reason);
      return emptyRows();
    };

    const settled = await Promise.allSettled([
      query(
        `SELECT a.id, t.libelle AS type, a.date_debut, a.date_fin, a.statut, a.motif, a.created_at,
                COALESCE(v.first_name || ' ' || v.last_name, '') AS valide_par
         FROM absences a
         JOIN types_absence t ON t.id = a.type_absence_id
         LEFT JOIN employes v ON v.id = a.valide_par
         WHERE a.employe_id = $1::uuid
         ORDER BY a.date_debut DESC
         LIMIT 100`,
        [employeeId]
      ),
      query(
        `SELECT id, date, heure_arrivee, heure_depart, statut, retard_minutes,
                duree_travail_minutes, heures_sup_minutes
         FROM pointages
         WHERE employe_id = $1::uuid
           AND (heure_arrivee IS NOT NULL OR heure_depart IS NOT NULL OR statut IN ('present', 'retard'))
         ORDER BY date DESC
         LIMIT 120`,
        [employeeId]
      ),
      query(
        `SELECT s.id, s.type_sanction, s.motif, s.mois_reference, s.statut, s.created_at, s.date_traitement,
                COALESCE(d.first_name || ' ' || d.last_name, '') AS decisionnee_par
         FROM sanctions s
         LEFT JOIN employes d ON d.id = s.traite_par
         WHERE s.employe_id = $1::uuid
         ORDER BY s.created_at DESC
         LIMIT 100`,
        [employeeId]
      ),
      query(
        `SELECT id, created_at, action, entite, details
         FROM audit_logs
         WHERE user_id = $1::uuid OR entite_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 100`,
        [employeeId]
      ),
    ]);

    const absencesResult = unwrapQuery("absences", settled[0]);
    const pointagesResult = unwrapQuery("pointages", settled[1]);
    const sanctionsResult = unwrapQuery("sanctions", settled[2]);
    const activityResult = unwrapQuery("audit_logs", settled[3]);

    const totalAbsences = absencesResult.rowCount;
    const totalPointages = pointagesResult.rowCount;
    const totalSanctions = sanctionsResult.rowCount;

    const joursAbsence = absencesResult.rows.reduce((acc, a) => {
      const start = new Date(a.date_debut);
      const end = new Date(a.date_fin);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + (Number.isFinite(diff) && diff > 0 ? diff : 0);
    }, 0);

    const heureFinEmp = row.heure_fin;
    const totalMinutes = pointagesResult.rows.reduce((acc, p) => acc + effectiveWorkMinutes(p, heureFinEmp), 0);
    const totalSupMinutes = pointagesResult.rows.reduce((acc, p) => acc + Number(p.heures_sup_minutes || 0), 0);

    const toHours = (minutes) => (minutes / 60).toFixed(2);

    res.json({
      profile: {
        id: String(row.id),
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        service: row.service,
        poste: row.poste || "",
        active: row.active,
        adminPermissions: adminPerms,
        createdAt: row.created_at,
      },
      stats: {
        totalAbsences,
        totalPointages,
        totalSanctions,
        joursAbsence,
        heuresTravaillees: toHours(totalMinutes),
        heuresSup: toHours(totalSupMinutes),
      },
      activity: activityResult.rows.map((log) => {
        const det = normalizeJsonbObject(log.details);
        return {
          id: String(log.id),
          timestamp: log.created_at,
          action: log.action,
          actor: det.user_name || "Système",
          target: log.entite,
          details: det.details != null ? String(det.details) : "",
        };
      }),
      absences: absencesResult.rows.map((a) => ({
        id: String(a.id),
        type: a.type,
        dateDebut: a.date_debut,
        dateFin: a.date_fin,
        statut: a.statut,
        motif: a.motif || "",
        validePar: a.valide_par || "",
        createdAt: a.created_at,
      })),
      pointages: pointagesResult.rows.map((p) => {
        const workMin = effectiveWorkMinutes(p, heureFinEmp);
        return {
          id: String(p.id),
          date: p.date,
          entree: formatTimeHHMM(p.heure_arrivee),
          sortie: formatTimeHHMM(p.heure_depart),
          type: pointageDisplayType(p),
          heuresTravaillees: Number((workMin / 60).toFixed(2)),
          heuresSup: Number((Number(p.heures_sup_minutes || 0) / 60).toFixed(2)),
          commentaire: "",
        };
      }),
      sanctions: sanctionsResult.rows.map((s) => ({
        id: String(s.id),
        type: s.type_sanction,
        motif: s.motif,
        dateIncident: s.mois_reference,
        dateDecision: s.date_traitement || s.created_at,
        statut: s.statut,
        decisionneePar: s.decisionnee_par || "",
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.put("/admins/:id/suspend", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `UPDATE employes SET actif = false, badge_actif = false
       WHERE id = $1 AND role IN ('admin', 'employee')
       RETURNING first_name, last_name`,
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    const target = result.rows[0];
    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "SUSPEND_USER", target: `${target.first_name} ${target.last_name}`,
        details: "Désactivation du compte", ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put("/admins/:id/reset-password", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { password } = req.body || {};
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    const hash = await bcrypt.hash(String(password), 10);
    const result = await query(
      `UPDATE employes SET password_hash = $1, first_login = true
       WHERE id = $2 AND role IN ('admin', 'employee')
       RETURNING first_name, last_name`,
      [hash, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    const target = result.rows[0];
    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "RESET_PASSWORD", target: `${target.first_name} ${target.last_name}`,
        details: "Réinitialisation du mot de passe", ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/admins/:id", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `DELETE FROM employes WHERE id = $1 AND role IN ('admin', 'employee') RETURNING first_name, last_name`,
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    const deleted = result.rows[0];
    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "DELETE_USER", target: `${deleted.first_name} ${deleted.last_name}`,
        details: "Suppression définitive du compte", ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// NOUVELLES ROUTES SUPERVISION SUPERADMIN
// ⚠️ ROUTES FIXES AVANT LES ROUTES AVEC :id
// ═══════════════════════════════════════════════

// Désactiver plusieurs employés (FIXE - avant :id)
router.put("/admins/desactiver-multiple", async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Liste d'IDs requise" });
    }
    const result = await query(
      "UPDATE employes SET actif = false WHERE id = ANY($1::uuid[]) AND role IN ('admin', 'employee') RETURNING id, first_name, last_name, email, actif",
      [ids]
    );
    res.json({ success: true, message: `${result.rows.length} employé(s) désactivé(s)`, employes: result.rows });
  } catch (err) { next(err); }
});

// Désactiver un employé
router.put("/admins/:id/desactiver", async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE employes SET actif = false WHERE id = $1 AND role IN ('admin', 'employee') RETURNING id, first_name, last_name, email, actif",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé non trouvé" });
    res.json({ success: true, message: "Employé désactivé", employe: result.rows[0] });
  } catch (err) { next(err); }
});

// Réactiver un employé
router.put("/admins/:id/reactiver", async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE employes SET actif = true WHERE id = $1 AND role IN ('admin', 'employee') RETURNING id, first_name, last_name, email, actif",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé non trouvé" });
    res.json({ success: true, message: "Employé réactivé", employe: result.rows[0] });
  } catch (err) { next(err); }
});

// ═══ RÉFÉRENTIELS ═══
router.get("/referentials", async (_req, res, next) => {
  try {
    const services = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
    const postes = await query("SELECT DISTINCT poste FROM employes WHERE poste IS NOT NULL ORDER BY poste");
    res.json({ services: services.rows.map((r) => r.nom), postes: postes.rows.map((r) => r.poste) });
  } catch (err) { next(err); }
});

// ═══ RH ABSENCES ═══
router.get("/rh-absences", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.date_debut, a.date_fin, a.statut, a.motif,
              e.first_name || ' ' || e.last_name AS employe_name,
              t.libelle AS type_absence,
              v.first_name || ' ' || v.last_name AS valide_par
       FROM absences a
       JOIN employes e ON e.id = a.employe_id
       JOIN types_absence t ON t.id = a.type_absence_id
       LEFT JOIN employes v ON v.id = a.valide_par
       ORDER BY a.date_debut DESC
       LIMIT 100`
    );
    res.json(result.rows.map((r) => ({
      id: String(r.id),
      employeeName: r.employe_name,
      typeAbsence: r.type_absence,
      dateDebut: r.date_debut,
      dateFin: r.date_fin,
      statut: r.statut,
      validePar: r.valide_par || null,
      motif: r.motif || null,
    })));
  } catch (err) { next(err); }
});

// ═══ ACTIVITY ═══
router.get("/activity", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, created_at, action, entite, details
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 20`
    );
    res.json(rows.rows.map((row) => ({
      id: String(row.id),
      timestamp: row.created_at,
      type: row.action.includes("CONFIG") ? "alert"
        : row.action.includes("CREATE") ? "rh_validation"
        : "badge_scan",
      userName: row.details?.user_name || "Système",
      details: row.details?.details || row.action,
      severity: row.action.includes("DELETE") ? "high" : "low",
    })));
  } catch (err) { next(err); }
});

// ═══ STATS GLOBALES ═══
router.get("/stats/global", async (_req, res, next) => {
  try {
    const employees = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'employee'");
    const admins = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'admin'");
    const activeUsers = await query("SELECT COUNT(*)::int AS total FROM employes WHERE actif = true AND role != 'superadmin'");
    const pendingAbsences = await query("SELECT COUNT(*)::int AS total FROM absences WHERE statut = 'en_attente'");
    res.json({
      employees: employees.rows[0].total,
      admins: admins.rows[0].total,
      activeUsers: activeUsers.rows[0].total,
      absenteeismRate: 0,
      pendingAbsences: pendingAbsences.rows[0].total,
      lateArrivalsCount: 0,
      monthlyOvertimeHours: 0,
      estimatedOvertimeCost: 0,
    });
  } catch (err) { next(err); }
});

// ═══ CONFIG ═══
router.get("/config", async (_req, res, next) => {
  try {
    const result = await query("SELECT cle, valeur FROM configurations ORDER BY cle");
    const config = {};
    for (const row of result.rows) {
      try { config[row.cle] = JSON.parse(row.valeur); } catch { config[row.cle] = row.valeur; }
    }
    res.json(config);
  } catch (err) { next(err); }
});

// ═══ AUDIT LOGS ═══
router.get("/audit-logs", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 20)));
    const offset = (page - 1) * pageSize;
    const countResult = await query("SELECT COUNT(*)::int AS total FROM audit_logs");
    const total = countResult.rows[0].total;
    const result = await query("SELECT id, created_at, user_id, action, entite, details FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2", [pageSize, offset]);
    res.json({
      items: result.rows.map(r => ({ id: String(r.id), timestamp: r.created_at, userId: String(r.user_id || ""), userName: r.details?.user_name || "", action: r.action, target: r.entite, details: r.details?.details || "" })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) { next(err); }
});

export default router;