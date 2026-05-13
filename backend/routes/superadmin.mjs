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

/** Minutes depuis minuit pour une valeur TIME / string "HH:MM:SS". */
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

/** Jour civil local à partir d'une DATE PostgreSQL (évite décalage UTC). */
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

/**
 * Minutes travaillées : colonne BDD si renseignée, sinon écart arrivée–départ,
 * sinon arrivée seule → jusqu'à l'heure de fin prévue (contrat).
 */
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

/** Affichage fiche employé : uniquement présent / retard. */
function pointageDisplayType(p) {
  const s = String(p.statut || "").toLowerCase();
  if (s === "retard" || Number(p.retard_minutes || 0) > 0) return "retard";
  return "present";
}

const router = Router();

// Toutes les routes sont protégées par requireSuperAdmin
router.use(requireSuperAdmin);

// ═══════════════════════════════════════════════
// PROFIL SUPERADMIN (me)
// ═══════════════════════════════════════════════

// ─── GET /api/admin/me ───
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

// ─── PUT /api/admin/me ───
router.put("/me", async (req, res, next) => {
  try {
    const { firstName, lastName, email, service, poste, password } = req.body || {};

    // Si service est fourni, convertir nom → service_id
    let serviceId = null;
    if (service) {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
      if (srvResult.rowCount) {
        serviceId = srvResult.rows[0].id;
      }
    }

    // Si un nouveau password est fourni, le hasher
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
    // Récupérer le nom du service
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

// ─── GET /api/admin/admins ───
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

// ─── POST /api/admin/admins ───
router.post("/admins", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, email, role, service, poste, badgeUid, password, adminPermissions } = req.body || {};
    if (!firstName || !lastName || !email || !service || !password) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    // Trouver le service_id depuis le nom du service
    const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
    if (!srvResult.rowCount) {
      return res.status(400).json({ message: `Service "${service}" introuvable.` });
    }
    const serviceId = srvResult.rows[0].id;

    const safeRole = role === "admin" ? "admin" : "employee";
    const permissionsPayload = safeRole === "admin" ? (adminPermissions || {}) : {};
    const hash = await bcrypt.hash(password, 10);

    // Générer le matricule
    const matResult = await query("SELECT generate_matricule() AS mat");
    const matricule = matResult.rows[0].mat;

    const insert = await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, role, service_id, poste, uid_badge, actif, admin_permissions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::jsonb, $11)
       RETURNING id, first_name, last_name, email, role, poste, actif, uid_badge, admin_permissions, created_at`,
      [matricule, firstName, lastName, String(email).toLowerCase(), hash, safeRole, serviceId, poste || null, badgeUid || null, JSON.stringify(permissionsPayload), req.auth.sub]
    );
    const created = insert.rows[0];

    // Notification de bienvenue
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'bienvenue', 'Bienvenue !', $2)`,
      [created.id, `Bienvenue chez DigitalAfrika. Votre identifiant de connexion est : ${email}`]
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

// ─── PUT /api/admin/admins/:id ───
router.put("/admins/:id", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, service, poste, role, badgeUid, adminPermissions } = req.body || {};
    const safeRole = role ? (role === "admin" ? "admin" : "employee") : null;

    // Si service est fourni, convertir nom → service_id
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

// ─── GET /api/admin/employees/:id ─── (Détail complet utilisateur)
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
    const adminPerms =
      row.role === "admin" ? normalizeJsonbObject(row.admin_permissions) : undefined;

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
           AND (
             heure_arrivee IS NOT NULL
             OR heure_depart IS NOT NULL
             OR statut IN ('present', 'retard')
           )
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
    const totalMinutes = pointagesResult.rows.reduce(
      (acc, p) => acc + effectiveWorkMinutes(p, heureFinEmp),
      0
    );
    const totalSupMinutes = pointagesResult.rows.reduce(
      (acc, p) => acc + Number(p.heures_sup_minutes || 0),
      0
    );

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

// ─── PUT /api/admin/admins/:id/suspend ───
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

// ─── PUT /api/admin/admins/:id/reset-password ───
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

// ─── DELETE /api/admin/admins/:id ───
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
// CONFIGURATION SYSTÈME
// ═══════════════════════════════════════════════

// ─── GET /api/admin/config ───
router.get("/config", async (_req, res, next) => {
  try {
    const result = await query("SELECT cle, valeur FROM configurations ORDER BY cle");
    const config = {};
    for (const row of result.rows) {
      // Essayer de parser en JSON, sinon garder comme string
      try {
        config[row.cle] = JSON.parse(row.valeur);
      } catch {
        config[row.cle] = row.valeur;
      }
    }
    const {
      company_logo: companyLogoRaw,
      logoBase64: legacyLogoRaw,
      ...configRest
    } = config;
    const logoBase64 =
      (typeof companyLogoRaw === "string" && companyLogoRaw) ||
      (typeof legacyLogoRaw === "string" && legacyLogoRaw) ||
      "";

    // Mapper les clés françaises vers les clés anglaises attendues par le frontend
    res.json({
      lateThreshold: config.seuil_rappel_retards ?? 3,
      lateWarningThreshold: config.seuil_avertissement ?? 5,
      lateSanctionThreshold: config.seuil_sanction ?? 6,
      absenceThreshold: config.seuil_absence_avert ?? 1,
      absenceSanctionThreshold: config.seuil_absence_sanction ?? 2,
      defaultEntry: config.heure_debut_defaut ?? "08:00",
      defaultExit: config.heure_fin_defaut ?? "17:00",
      requireJustification: config.require_justification !== undefined ? String(config.require_justification) === "true" : true,
      notifyOnAbsence3Days: config.notify_absence_3d !== undefined ? String(config.notify_absence_3d) === "true" : true,
      notifySuspiciousRhValidation: config.notify_suspicious_rh !== undefined ? String(config.notify_suspicious_rh) === "true" : true,
      dashboardLateMinutesMin: Math.max(0, parseInt(String(config.seuil_retard_dashboard_min ?? 15), 10) || 15),
      overtimeHourlyRateFcfa: Math.max(0, parseInt(String(config.cout_heure_sup_fcfa ?? 4000), 10) || 4000),
      logoBase64,
      // Conserver les autres clés (sans dupliquer le logo en base64 deux fois)
      ...configRest,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/config ───
router.put("/config", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const body = req.body || {};

    // Mapper clés anglaises → clés françaises
    const keyMap = {
      lateThreshold: "seuil_rappel_retards",
      lateWarningThreshold: "seuil_avertissement",
      lateSanctionThreshold: "seuil_sanction",
      absenceThreshold: "seuil_absence_avert",
      absenceSanctionThreshold: "seuil_absence_sanction",
      defaultEntry: "heure_debut_defaut",
      defaultExit: "heure_fin_defaut",
      requireJustification: "require_justification",
      notifyOnAbsence3Days: "notify_absence_3d",
      notifySuspiciousRhValidation: "notify_suspicious_rh",
      logoBase64: "company_logo",
      dashboardLateMinutesMin: "seuil_retard_dashboard_min",
      overtimeHourlyRateFcfa: "cout_heure_sup_fcfa",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbKey = keyMap[key] || key;
      const dbValue = typeof value === "string" ? value : String(value);
      await query(
        `INSERT INTO configurations (cle, valeur, modifie_par, updated_at)
         VALUES ($3, $1, $2, NOW())
         ON CONFLICT (cle) DO UPDATE SET valeur = $1, modifie_par = $2, updated_at = NOW()`,
        [dbValue, req.auth.sub, dbKey]
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "logoBase64")) {
      await query("DELETE FROM configurations WHERE cle = 'logoBase64'");
    }

    // ── Propager les horaires sur tous les employés/admins ──
    // Quand le superadmin modifie defaultEntry ou defaultExit,
    // on met à jour heure_debut / heure_fin de tous les employés et admins
    if (body.defaultEntry) {
      await query(
        `UPDATE employes SET heure_debut = $1::time WHERE role IN ('employee', 'admin')`,
        [body.defaultEntry]
      );
    }
    if (body.defaultExit) {
      await query(
        `UPDATE employes SET heure_fin = $1::time WHERE role IN ('employee', 'admin')`,
        [body.defaultExit]
      );
    }

    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "UPDATE_CONFIG", target: "CONFIG_GLOBAL",
        details: `Mise à jour des paramètres système${body.defaultEntry ? ` — Arrivée: ${body.defaultEntry}` : ""}${body.defaultExit ? ` — Départ: ${body.defaultExit}` : ""}`,
        ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════

// ─── GET /api/admin/audit-logs ───
router.get("/audit-logs", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 20)));
    const q = String(req.query.q || "").trim().toLowerCase();
    const actionsRaw = String(req.query.actions || "").trim().toUpperCase();
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();
    const sortByRaw = String(req.query.sortBy || "created_at").trim();
    const sortOrderRaw = String(req.query.sortOrder || "desc").trim().toLowerCase();

    const sortMap = { created_at: "created_at", user_name: "details->>'user_name'", action: "action", target: "entite" };
    const sortBy = sortMap[sortByRaw] || "created_at";
    const sortOrder = sortOrderRaw === "asc" ? "ASC" : "DESC";

    const values = [];
    const where = [];

    if (q) {
      values.push(`%${q}%`);
      const idx = values.length;
      where.push(`(LOWER(details->>'user_name') LIKE $${idx} OR LOWER(entite) LIKE $${idx} OR LOWER(details->>'details') LIKE $${idx})`);
    }
    if (actionsRaw) {
      const actions = actionsRaw.split(",").map((a) => a.trim()).filter(Boolean);
      if (actions.length) {
        const placeholders = actions.map((_a, i) => `$${values.length + i + 1}`);
        values.push(...actions);
        where.push(`action IN (${placeholders.join(", ")})`);
      }
    }
    if (dateFrom) { values.push(dateFrom); where.push(`created_at::date >= $${values.length}::date`); }
    if (dateTo) { values.push(dateTo); where.push(`created_at::date <= $${values.length}::date`); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await query(`SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`, values);
    const total = countResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    values.push(pageSize);
    values.push(offset);

    const rows = await query(
      `SELECT id, created_at, user_id, action, entite, details
       FROM audit_logs
       ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${values.length - 1}
       OFFSET $${values.length}`,
      values
    );

    res.json({
      items: rows.rows.map((log) => ({
        id: String(log.id),
        timestamp: log.created_at,
        userId: String(log.user_id || ""),
        userName: log.details?.user_name || "",
        action: log.action,
        target: log.entite,
        details: log.details?.details || "",
      })),
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/audit-logs/export ───
router.get("/audit-logs/export", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const actionsRaw = String(req.query.actions || "").trim().toUpperCase();
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

    const values = [];
    const where = [];
    if (q) {
      values.push(`%${q}%`);
      const idx = values.length;
      where.push(`(LOWER(details->>'user_name') LIKE $${idx} OR LOWER(entite) LIKE $${idx})`);
    }
    if (actionsRaw) {
      const actions = actionsRaw.split(",").map((a) => a.trim()).filter(Boolean);
      if (actions.length) {
        const placeholders = actions.map((_a, i) => `$${values.length + i + 1}`);
        values.push(...actions);
        where.push(`action IN (${placeholders.join(", ")})`);
      }
    }
    if (dateFrom) { values.push(dateFrom); where.push(`created_at::date >= $${values.length}::date`); }
    if (dateTo) { values.push(dateTo); where.push(`created_at::date <= $${values.length}::date`); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.csv"');
    res.write("timestamp,user_name,action,target,details\n");

    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const batchValues = [...values, pageSize, offset];
      const rows = await query(
        `SELECT created_at, action, entite, details
         FROM audit_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${batchValues.length - 1}
         OFFSET $${batchValues.length}`,
        batchValues
      );
      if (!rows.rowCount) break;
      for (const row of rows.rows) {
        res.write([
          escape(row.created_at),
          escape(row.details?.user_name || ""),
          escape(row.action),
          escape(row.entite),
          escape(row.details?.details || ""),
        ].join(",") + "\n");
      }
      offset += pageSize;
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// STATS GLOBALES
// ═══════════════════════════════════════════════

// ─── GET /api/admin/stats/global ───
router.get("/stats/global", async (_req, res, next) => {
  try {
    const employees = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'employee'");
    const admins = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'admin'");
    const activeUsers = await query("SELECT COUNT(*)::int AS total FROM employes WHERE actif = true AND role != 'superadmin'");
    const totalUsers = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role IN ('employee', 'admin')");

    // Vrais KPIs depuis les pointages
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const dashCfg = await query(
      "SELECT cle, valeur FROM configurations WHERE cle IN ('seuil_retard_dashboard_min','cout_heure_sup_fcfa')"
    );
    const dashMap = {};
    for (const r of dashCfg.rows) dashMap[r.cle] = r.valeur;
    const lateMinThreshold = Math.max(0, parseInt(String(dashMap.seuil_retard_dashboard_min ?? "15"), 10) || 15);
    const overtimeRateFcfa = Math.max(0, parseInt(String(dashMap.cout_heure_sup_fcfa ?? "4000"), 10) || 4000);

    const lateToday = await query(
      `SELECT COUNT(*)::int AS total FROM pointages p
       JOIN employes e ON e.id = p.employe_id
       WHERE p.date = CURRENT_DATE
         AND p.statut = 'retard'
         AND COALESCE(p.retard_minutes, 0) >= $1`,
      [lateMinThreshold]
    );

    const pendingAbsences = await query(
      `SELECT COUNT(*)::int AS total FROM absences WHERE statut = 'en_attente'`
    );

    const overtime = await query(
      `SELECT COALESCE(SUM(heures_sup_minutes), 0)::int AS total
       FROM pointages WHERE date >= $1 AND date <= $2`,
      [startOfMonth, endOfMonth]
    );

    const overtimeMinutes = Number(overtime.rows[0].total || 0);
    const overtimeHours = Math.round((overtimeMinutes / 60) * 10) / 10;

    const total = totalUsers.rows[0].total || 1;
    const presentToday = await query(
      `SELECT COUNT(*)::int AS total FROM pointages p
       JOIN employes e ON e.id = p.employe_id
       WHERE p.date = CURRENT_DATE AND p.heure_arrivee IS NOT NULL`
    );

    // Calcul recommandé production: absentéisme mensuel réel (jours-homme ouvrés),
    // au lieu d'un simple snapshot "présents aujourd'hui".
    const activeEmployeesResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM employes
       WHERE role = 'employee' AND actif = true`
    );
    const activeEmployees = activeEmployeesResult.rows[0].total;

    const periodEnd = new Date() < new Date(endOfMonth) ? new Date().toISOString().split("T")[0] : endOfMonth;
    const workingDaysResult = await query(
      `WITH days AS (
         SELECT d::date AS day
         FROM generate_series($1::date, $2::date, INTERVAL '1 day') d
       )
       SELECT COUNT(*)::int AS total
       FROM days
       WHERE EXTRACT(ISODOW FROM day) < 6
         AND NOT EXISTS (
           SELECT 1
           FROM jours_feries jf
           WHERE (jf.recurrent = false AND jf.date = day)
              OR (jf.recurrent = true AND to_char(jf.date, 'MM-DD') = to_char(day, 'MM-DD'))
         )`,
      [startOfMonth, periodEnd]
    );
    const workingDays = workingDaysResult.rows[0].total;
    const expectedEmployeeDays = activeEmployees * workingDays;

    const absencesResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM pointages p
       JOIN employes e ON e.id = p.employe_id
       WHERE p.date >= $1
         AND p.date <= $2
         AND p.statut = 'absent'
         AND e.role = 'employee'
         AND e.actif = true`,
      [startOfMonth, periodEnd]
    );
    const absentEmployeeDays = absencesResult.rows[0].total;
    const absenteeismRate = expectedEmployeeDays > 0
      ? Number(((absentEmployeeDays / expectedEmployeeDays) * 100).toFixed(1))
      : 0;

    res.json({
      employees: employees.rows[0].total,
      admins: admins.rows[0].total,
      activeUsers: activeUsers.rows[0].total,
      absenteeismRate: Math.max(0, Math.min(100, absenteeismRate)),
      pendingAbsences: pendingAbsences.rows[0].total,
      lateArrivalsCount: lateToday.rows[0].total,
      monthlyOvertimeHours: overtimeHours,
      estimatedOvertimeCost: Math.round((overtimeMinutes / 60) * overtimeRateFcfa),
      lateDashboardMinutesThreshold: lateMinThreshold,
      overtimeHourlyRateFcfa: overtimeRateFcfa,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/activity ───
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
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// EXPORT GLOBAL (CSV + PDF)
// ═══════════════════════════════════════════════

// ─── GET /api/admin/export/global ───
router.get("/export/global", async (req, res, next) => {
  try {
    const type = String(req.query.type || "pointages");
    const format = String(req.query.format || "csv").toLowerCase();
    const service = String(req.query.service || "all");
    const month = String(req.query.month || "");

    let rows = [];
    const values = [];
    const where = [];

    if (service && service !== "all") {
      values.push(service);
      where.push(`s.nom = $${values.length}`);
    }

    if (type === "absences") {
      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        s.nom AS service, t.libelle AS type_absence,
                        a.date_debut, a.date_fin, a.statut, a.motif
                 FROM absences a
                 JOIN employes e ON e.id = a.employe_id
                 JOIN services s ON s.id = e.service_id
                 JOIN types_absence t ON t.id = a.type_absence_id`;
      if (month) { values.push(`${month}-01`); where.push(`a.date_debut >= $${values.length}`); }
      if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
      sql += " ORDER BY a.date_debut DESC";
      rows = (await query(sql, values)).rows;
    } else if (type === "disciplinaire") {
      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        s.nom AS service, sa.type_sanction, sa.motif,
                        sa.nb_retards, sa.nb_absences_injust, sa.statut, sa.mois_reference
                 FROM sanctions sa
                 JOIN employes e ON e.id = sa.employe_id
                 JOIN services s ON s.id = e.service_id`;
      if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
      sql += " ORDER BY sa.created_at DESC";
      rows = (await query(sql, values)).rows;
    } else {
      // pointages
      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        s.nom AS service, p.date, p.heure_arrivee, p.heure_depart,
                        p.statut, p.retard_minutes, p.heures_sup_minutes
                 FROM pointages p
                 JOIN employes e ON e.id = p.employe_id
                 JOIN services s ON s.id = e.service_id`;
      if (month) {
        values.push(`${month}-01`);
        const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0];
        where.push(`p.date >= $${values.length}`);
        values.push(endDate);
        where.push(`p.date <= $${values.length}`);
      }
      if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
      sql += " ORDER BY p.date DESC";
      rows = (await query(sql, values)).rows;
    }

    const headers = Object.keys(rows[0] || { vide: "" });
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.pdf"`);

      const serviceLabel = service === "all" ? "Tous les Services" : service;
      const periodLabel = month || "Toutes";

      if (type === "absences") {
        await generateReportPDF(res, {
          title: "Rapport d'absences consolidé",
          columns: [
            { header: "Matricule", key: "matricule", width: 1.2 },
            { header: "Nom", key: "nom", width: 2.2 },
            { header: "Service", key: "service", width: 1.4 },
            { header: "Type", key: "type_absence", width: 1.4 },
            { header: "Début", key: "date_debut", width: 1.1 },
            { header: "Fin", key: "date_fin", width: 1.1 },
            { header: "Statut", key: "statut", width: 1 },
          ],
          rows,
          metadata: { period: periodLabel, service: serviceLabel },
        });
        return;
      }

      if (type === "disciplinaire") {
        await generateReportPDF(res, {
          title: "Audit disciplinaire & sanctions",
          columns: [
            { header: "Matricule", key: "matricule", width: 1.2 },
            { header: "Nom", key: "nom", width: 2 },
            { header: "Service", key: "service", width: 1.3 },
            { header: "Type sanction", key: "type_sanction", width: 1.4 },
            { header: "Motif", key: "motif", width: 2 },
            { header: "Statut", key: "statut", width: 1 },
            { header: "Mois réf.", key: "mois_reference", width: 1 },
          ],
          rows,
          metadata: { period: periodLabel, service: serviceLabel },
        });
        return;
      }

      // pointages (défaut)
      await generateReportPDF(res, {
        title: "Registre des pointages mensuel",
        columns: [
          { header: "Matricule", key: "matricule", width: 1.2 },
          { header: "Nom", key: "nom", width: 2 },
          { header: "Service", key: "service", width: 1.4 },
          { header: "Date", key: "date", width: 1.1 },
          { header: "Arrivée", key: "heure_arrivee", width: 0.9 },
          { header: "Départ", key: "heure_depart", width: 0.9 },
          { header: "Statut", key: "statut", width: 1 },
          { header: "Retard (min)", key: "retard_minutes", width: 0.85 },
          { header: "H. sup (min)", key: "heures_sup_minutes", width: 0.85 },
        ],
        rows,
        metadata: { period: periodLabel, service: serviceLabel },
      });
      return;
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Export ${type}`);
      worksheet.columns = headers.map(h => ({ header: h.toUpperCase(), key: h, width: 20 }));
      worksheet.addRows(rows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // CSV
    const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// RÉFÉRENTIELS (services / postes)
// ═══════════════════════════════════════════════

// ─── GET /api/admin/referentials ───
router.get("/referentials", async (_req, res, next) => {
  try {
    const services = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
    const postes = await query("SELECT DISTINCT poste FROM employes WHERE poste IS NOT NULL ORDER BY poste");
    res.json({
      services: services.rows.map((r) => r.nom),
      postes: postes.rows.map((r) => r.poste),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/referentials/:kind ───
router.post("/referentials/:kind", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const kind = req.params.kind;
    const { value } = req.body || {};
    if (!value || !String(value).trim()) {
      return res.status(400).json({ message: "Valeur requise." });
    }
    const normalized = String(value).trim();

    if (kind === "services") {
      // Créer un vrai service en BDD
      const existing = await query("SELECT id FROM services WHERE nom = $1", [normalized]);
      if (existing.rowCount) {
        return res.status(409).json({ message: "Service déjà existant." });
      }
      await query("INSERT INTO services (nom) VALUES ($1)", [normalized]);
      const all = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
      if (actor) {
        await writeAuditLog({
          userId: actor.id, userName: actor.name, role: actor.role,
          action: "UPDATE_CONFIG", target: "SERVICES",
          details: `Ajout du service "${normalized}"`, ip: req.ip,
        });
      }
      return res.status(201).json({ items: all.rows.map((r) => r.nom) });
    }

    if (kind === "postes") {
      // Les postes sont des valeurs libres sur les employés, pas de table dédiée
      // On les stocke dans la config pour le référentiel
      const configResult = await query("SELECT valeur FROM configurations WHERE cle = 'postes_referentiel'");
      let postes = [];
      if (configResult.rowCount) {
        try { postes = JSON.parse(configResult.rows[0].valeur); } catch { postes = []; }
      }
      if (postes.includes(normalized)) {
        return res.status(409).json({ message: "Poste déjà existant." });
      }
      postes.push(normalized);
      if (configResult.rowCount) {
        await query("UPDATE configurations SET valeur = $1 WHERE cle = 'postes_referentiel'", [JSON.stringify(postes)]);
      } else {
        await query("INSERT INTO configurations (cle, valeur, description) VALUES ('postes_referentiel', $1, 'Référentiel postes')", [JSON.stringify(postes)]);
      }
      if (actor) {
        await writeAuditLog({
          userId: actor.id, userName: actor.name, role: actor.role,
          action: "UPDATE_CONFIG", target: "POSTES",
          details: `Ajout du poste "${normalized}"`, ip: req.ip,
        });
      }
      return res.status(201).json({ items: postes });
    }

    res.status(400).json({ message: "Référentiel invalide (services ou postes)." });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/referentials/:kind/:value ───
router.delete("/referentials/:kind/:value", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const kind = req.params.kind;
    const value = decodeURIComponent(req.params.value);

    if (kind === "services") {
      // Vérifier si le service est utilisé
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [value]);
      if (!srvResult.rowCount) {
        return res.status(404).json({ message: "Service introuvable." });
      }
      const used = await query("SELECT COUNT(*)::int AS total FROM employes WHERE service_id = $1", [srvResult.rows[0].id]);
      if (used.rows[0].total > 0) {
        return res.status(409).json({ message: `Impossible de supprimer ce service : il est utilisé par ${used.rows[0].total} compte(s).` });
      }
      await query("UPDATE services SET actif = false WHERE id = $1", [srvResult.rows[0].id]);
      const all = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
      if (actor) {
        await writeAuditLog({
          userId: actor.id, userName: actor.name, role: actor.role,
          action: "UPDATE_CONFIG", target: "SERVICES",
          details: `Suppression du service "${value}"`, ip: req.ip,
        });
      }
      return res.json({ items: all.rows.map((r) => r.nom) });
    }

    if (kind === "postes") {
      const used = await query("SELECT COUNT(*)::int AS total FROM employes WHERE poste = $1", [value]);
      if (used.rows[0].total > 0) {
        return res.status(409).json({ message: `Impossible de supprimer ce poste : il est utilisé par ${used.rows[0].total} compte(s).` });
      }
      const configResult = await query("SELECT valeur FROM configurations WHERE cle = 'postes_referentiel'");
      let postes = [];
      if (configResult.rowCount) {
        try { postes = JSON.parse(configResult.rows[0].valeur); } catch { postes = []; }
      }
      postes = postes.filter((p) => p !== value);
      await query("UPDATE configurations SET valeur = $1 WHERE cle = 'postes_referentiel'", [JSON.stringify(postes)]);
      if (actor) {
        await writeAuditLog({
          userId: actor.id, userName: actor.name, role: actor.role,
          action: "UPDATE_CONFIG", target: "POSTES",
          details: `Suppression du poste "${value}"`, ip: req.ip,
        });
      }
      return res.json({ items: postes });
    }

    res.status(400).json({ message: "Référentiel invalide." });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════
// SUPERVISION RH (absences avec auditabilité)
// ═══════════════════════════════════════════════

// ─── GET /api/admin/rh-absences ───
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
      dateDebut: r.date_debut ? new Date(r.date_debut).toISOString().split("T")[0] : "",
      dateFin: r.date_fin ? new Date(r.date_fin).toISOString().split("T")[0] : "",
      statut: r.statut,
      validePar: r.valide_par || null,
      motif: r.motif || null,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/rh-absences/:id/override ───
router.put("/rh-absences/:id/override", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { statut } = req.body || {};
    if (!statut || !["approuvee", "rejetee", "annulee"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide (approuvee, rejetee, annulee)." });
    }

    const result = await query(
      `UPDATE absences SET statut = $1, valide_par = $2, date_validation = NOW()
       WHERE id = $3
       RETURNING id`,
      [statut, req.auth.sub, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Absence introuvable." });
    }

    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "OVERRIDE_RH", target: `absence_${req.params.id}`,
        details: `Décision RH outrepassée → ${statut}`, ip: req.ip,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
