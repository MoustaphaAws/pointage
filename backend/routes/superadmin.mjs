import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../db.mjs";
import { requireSuperAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";
import { formatTimeHHMM } from "../utils/formatDbTime.mjs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeJsonbObject(val) {
  if (val == null) return {};
  if (typeof val === "object" && !Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
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
  if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
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
  if (arr && dep && dep >= arr) return Math.floor((dep.getTime() - arr.getTime()) / 60000);
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

// Helper : résoudre user_name depuis user_id dans audit_logs
async function resolveUserName(userId) {
  if (!userId) return "Système";
  try {
    const r = await query("SELECT first_name, last_name FROM employes WHERE id = $1", [userId]);
    if (r.rowCount) return `${r.rows[0].first_name} ${r.rows[0].last_name}`;
  } catch { /* ignore */ }
  return "Système";
}

const router = Router();
router.use(requireSuperAdmin);

// ═══════════════════════════════════════════════
// PROFIL SUPERADMIN
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
    if (!result.rowCount) return res.status(404).json({ message: "Profil SuperAdmin introuvable." });
    const u = result.rows[0];
    res.json({
      id: String(u.id), firstName: u.first_name, lastName: u.last_name,
      email: u.email, role: u.role, service: u.service, poste: u.poste || "",
      active: u.active, badgeUid: u.badge_uid || "-", createdAt: u.created_at,
    });
  } catch (err) { next(err); }
});

router.put("/me", async (req, res, next) => {
  try {
    const { firstName, lastName, email, service, poste, password } = req.body || {};
    let serviceId = null;
    if (service) {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
      if (srvResult.rowCount) serviceId = srvResult.rows[0].id;
    }
    let hashClause = "";
    const values = [firstName || null, lastName || null, email ? String(email).toLowerCase() : null, serviceId, poste || null, req.auth.sub];
    if (password && String(password).length >= 4) {
      const hash = await bcrypt.hash(String(password), 10);
      values.push(hash);
      hashClause = `, password_hash = $${values.length}`;
    }
    const result = await query(
      `UPDATE employes SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
         email = COALESCE($3, email), service_id = COALESCE($4, service_id), poste = COALESCE($5, poste)
         ${hashClause} WHERE id = $6 RETURNING *`,
      values
    );
    if (!result.rowCount) return res.status(404).json({ message: "Profil introuvable." });
    const u = result.rows[0];
    const srvName = await query("SELECT nom FROM services WHERE id = $1", [u.service_id]);
    const actor = await getActor(req);
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "UPDATE_PROFILE", target: "SUPERADMIN", details: "Mise à jour du profil SuperAdmin", ip: req.ip });
    res.json({
      id: String(u.id), firstName: u.first_name, lastName: u.last_name,
      email: u.email, role: u.role, service: srvName.rows[0]?.nom || "",
      poste: u.poste || "", active: u.actif, badgeUid: u.uid_badge || "-", createdAt: u.created_at,
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Cet email est déjà utilisé." });
    next(err);
  }
});

// ═══════════════════════════════════════════════
// GESTION UTILISATEURS
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
      id: String(r.id), firstName: r.first_name, lastName: r.last_name,
      email: r.email, role: r.role, service: r.service, poste: r.poste || "",
      active: r.active, adminPermissions: r.role === "admin" ? (r.admin_permissions || {}) : undefined,
      badgeUid: r.badge_uid || "-", createdAt: r.created_at,
    })));
  } catch (err) { next(err); }
});

router.post("/admins", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, email, role, service, poste, badgeUid, password, adminPermissions } = req.body || {};
    if (!firstName || !lastName || !email || !service || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
    if (!srvResult.rowCount) return res.status(400).json({ message: `Service "${service}" introuvable.` });
    const serviceId = srvResult.rows[0].id;
    const safeRole = role === "admin" ? "admin" : "employee";
    const permissionsPayload = safeRole === "admin" ? (adminPermissions || {}) : {};
    const hash = await bcrypt.hash(password, 10);
    const matResult = await query("SELECT generate_matricule() AS mat");
    const matricule = matResult.rows[0].mat;
    const insert = await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, role, service_id, poste, uid_badge, actif, admin_permissions, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10::jsonb,$11)
       RETURNING id, first_name, last_name, email, role, poste, actif, uid_badge, admin_permissions, created_at`,
      [matricule, firstName, lastName, String(email).toLowerCase(), hash, safeRole, serviceId, poste || null, badgeUid || null, JSON.stringify(permissionsPayload), req.auth.sub]
    );
    const created = insert.rows[0];
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message) VALUES ($1,'bienvenue','Bienvenue !',$2)`,
      [created.id, `Bienvenue chez OnTime. Votre identifiant de connexion est : ${email}`]
    );
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "CREATE_USER", target: `${created.first_name} ${created.last_name}`, details: `Création compte ${safeRole}`, ip: req.ip });
    res.status(201).json({
      id: String(created.id), firstName: created.first_name, lastName: created.last_name,
      email: String(email).toLowerCase(), role: created.role, service, poste: created.poste || "",
      active: created.actif, adminPermissions: created.role === "admin" ? (created.admin_permissions || {}) : undefined,
      badgeUid: created.uid_badge || "-", createdAt: created.created_at,
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Un utilisateur avec cet email ou ce badge existe déjà." });
    next(err);
  }
});

// ─────────────────────────────────────────────
// ⚠️  ROUTES BULK EN PREMIER (avant /:id)
// ─────────────────────────────────────────────

// Désactiver plusieurs  →  PUT /admins/desactiver-multiple
router.put("/admins/desactiver-multiple", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "Liste d'IDs requise" });
    const result = await query(
      `UPDATE employes SET actif = false WHERE id = ANY($1::uuid[]) AND role IN ('admin','employee')
       RETURNING id, first_name, last_name, email, actif`,
      [ids]
    );
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "DESACTIVER_MULTIPLE", target: `${result.rowCount} employé(s)`, details: `Désactivation en masse`, ip: req.ip });
    res.json({ success: true, message: `${result.rows.length} employé(s) désactivé(s)`, employes: result.rows });
  } catch (err) { next(err); }
});

// Supprimer plusieurs  →  DELETE /admins/supprimer-multiple
router.delete("/admins/supprimer-multiple", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "Liste d'IDs requise" });
    const result = await query(
      `DELETE FROM employes WHERE id = ANY($1::uuid[]) AND role IN ('admin','employee')
       RETURNING id, first_name, last_name`,
      [ids]
    );
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "SUPPRIMER_MULTIPLE", target: `${result.rowCount} employé(s)`, details: `Suppression en masse`, ip: req.ip });
    res.json({ success: true, message: `${result.rowCount} employé(s) supprimé(s)`, deleted: result.rows });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// Routes /:id (après les routes statiques bulk)
// ─────────────────────────────────────────────

router.put("/admins/:id", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { firstName, lastName, service, poste, role, badgeUid, adminPermissions } = req.body || {};
    const safeRole = role ? (role === "admin" ? "admin" : "employee") : null;
    let serviceId = null;
    if (service) {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [service]);
      if (!srvResult.rowCount) return res.status(400).json({ message: `Service "${service}" introuvable.` });
      serviceId = srvResult.rows[0].id;
    }
    const update = await query(
      `UPDATE employes SET
         first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
         service_id = COALESCE($3, service_id), poste = COALESCE($4, poste),
         role = CASE WHEN $5::text IS NULL THEN role ELSE $5::role_enum END,
         uid_badge = COALESCE($6, uid_badge),
         admin_permissions = CASE
           WHEN $8::jsonb IS NULL THEN admin_permissions
           WHEN COALESCE($5::text, role::text) = 'admin' THEN $8::jsonb
           ELSE '{}'::jsonb END
       WHERE id = $7 AND role IN ('admin','employee') RETURNING *`,
      [firstName || null, lastName || null, serviceId, poste || null, safeRole, badgeUid || null, req.params.id, adminPermissions !== undefined ? JSON.stringify(adminPermissions) : null]
    );
    if (!update.rowCount) return res.status(404).json({ message: "Utilisateur introuvable." });
    const updated = update.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "UPDATE_USER", target: `${updated.first_name} ${updated.last_name}`, details: "Mise à jour profil", ip: req.ip });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put("/admins/:id/suspend", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `UPDATE employes SET actif = false, badge_actif = false WHERE id = $1 AND role IN ('admin','employee') RETURNING first_name, last_name`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Utilisateur introuvable." });
    const target = result.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "SUSPEND_USER", target: `${target.first_name} ${target.last_name}`, details: "Désactivation du compte", ip: req.ip });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put("/admins/:id/reset-password", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { password } = req.body || {};
    if (!password || String(password).length < 8)
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    const hash = await bcrypt.hash(String(password), 10);
    const result = await query(
      `UPDATE employes SET password_hash = $1, first_login = true WHERE id = $2 AND role IN ('admin','employee') RETURNING first_name, last_name`,
      [hash, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Utilisateur introuvable." });
    const target = result.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "RESET_PASSWORD", target: `${target.first_name} ${target.last_name}`, details: "Réinitialisation mot de passe", ip: req.ip });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put("/admins/:id/desactiver", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `UPDATE employes SET actif = false WHERE id = $1 AND role IN ('admin','employee')
       RETURNING id, first_name, last_name, email, actif`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé non trouvé" });
    const target = result.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "DESACTIVER_EMPLOYE", target: `${target.first_name} ${target.last_name}`, details: "Désactivation du compte", ip: req.ip });
    res.json({ success: true, message: "Employé désactivé", employe: target });
  } catch (err) { next(err); }
});

router.put("/admins/:id/reactiver", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `UPDATE employes SET actif = true WHERE id = $1 AND role IN ('admin','employee')
       RETURNING id, first_name, last_name, email, actif`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé non trouvé" });
    const target = result.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "REACTIVER_EMPLOYE", target: `${target.first_name} ${target.last_name}`, details: "Réactivation du compte", ip: req.ip });
    res.json({ success: true, message: "Employé réactivé", employe: target });
  } catch (err) { next(err); }
});

router.delete("/admins/:id", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const result = await query(
      `DELETE FROM employes WHERE id = $1 AND role IN ('admin','employee') RETURNING first_name, last_name`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Utilisateur introuvable." });
    const deleted = result.rows[0];
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "DELETE_USER", target: `${deleted.first_name} ${deleted.last_name}`, details: "Suppression définitive", ip: req.ip });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get("/employees/:id", async (req, res, next) => {
  try {
    const employeeId = String(req.params.id || "").trim();
    if (!employeeId || !UUID_RE.test(employeeId))
      return res.status(400).json({ message: "Identifiant employé invalide." });
    const profileResult = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.role,
              s.nom AS service, e.poste, e.actif AS active,
              e.admin_permissions, e.created_at, e.heure_debut, e.heure_fin
       FROM employes e JOIN services s ON s.id = e.service_id
       WHERE e.id = $1::uuid AND e.role IN ('employee','admin') LIMIT 1`,
      [employeeId]
    );
    if (!profileResult.rowCount) return res.status(404).json({ message: "Employé introuvable." });
    const row = profileResult.rows[0];
    const adminPerms = row.role === "admin" ? normalizeJsonbObject(row.admin_permissions) : undefined;
    const emptyRows = () => ({ rows: [], rowCount: 0 });
    const unwrapQuery = (label, result) => {
      if (result.status === "fulfilled") return result.value;
      console.error(`GET /admin/employees/:id — ${label}:`, result.reason?.message);
      return emptyRows();
    };
    const settled = await Promise.allSettled([
      query(`SELECT a.id, t.libelle AS type, a.date_debut, a.date_fin, a.statut, a.motif, a.created_at,
                    COALESCE(v.first_name||' '||v.last_name,'') AS valide_par
             FROM absences a JOIN types_absence t ON t.id = a.type_absence_id
             LEFT JOIN employes v ON v.id = a.valide_par
             WHERE a.employe_id = $1::uuid ORDER BY a.date_debut DESC LIMIT 100`, [employeeId]),
      query(`SELECT id, date, heure_arrivee, heure_depart, statut, retard_minutes, duree_travail_minutes, heures_sup_minutes
             FROM pointages WHERE employe_id = $1::uuid
             AND (heure_arrivee IS NOT NULL OR heure_depart IS NOT NULL OR statut IN ('present','retard'))
             ORDER BY date DESC LIMIT 120`, [employeeId]),
      query(`SELECT s.id, s.type_sanction, s.motif, s.mois_reference, s.statut, s.created_at, s.date_traitement,
                    COALESCE(d.first_name||' '||d.last_name,'') AS decisionnee_par
             FROM sanctions s LEFT JOIN employes d ON d.id = s.traite_par
             WHERE s.employe_id = $1::uuid ORDER BY s.created_at DESC LIMIT 100`, [employeeId]),
      query(`SELECT id, created_at, action, entite, details, user_id
             FROM audit_logs WHERE user_id = $1::uuid OR entite_id = $1::uuid
             ORDER BY created_at DESC LIMIT 100`, [employeeId]),
    ]);
    const absencesResult  = unwrapQuery("absences", settled[0]);
    const pointagesResult = unwrapQuery("pointages", settled[1]);
    const sanctionsResult = unwrapQuery("sanctions", settled[2]);
    const activityResult  = unwrapQuery("audit_logs", settled[3]);
    const joursAbsence = absencesResult.rows.reduce((acc, a) => {
      const diff = Math.ceil((new Date(a.date_fin) - new Date(a.date_debut)) / 86400000) + 1;
      return acc + (Number.isFinite(diff) && diff > 0 ? diff : 0);
    }, 0);
    const heureFinEmp = row.heure_fin;
    const totalMinutes = pointagesResult.rows.reduce((acc, p) => acc + effectiveWorkMinutes(p, heureFinEmp), 0);
    const totalSupMinutes = pointagesResult.rows.reduce((acc, p) => acc + Number(p.heures_sup_minutes || 0), 0);
    const toHours = (m) => (m / 60).toFixed(2);
    res.json({
      profile: { id: String(row.id), firstName: row.first_name, lastName: row.last_name, email: row.email, role: row.role, service: row.service, poste: row.poste || "", active: row.active, adminPermissions: adminPerms, createdAt: row.created_at },
      stats: { totalAbsences: absencesResult.rowCount, totalPointages: pointagesResult.rowCount, totalSanctions: sanctionsResult.rowCount, joursAbsence, heuresTravaillees: toHours(totalMinutes), heuresSup: toHours(totalSupMinutes) },
      activity: activityResult.rows.map((log) => {
        const det = normalizeJsonbObject(log.details);
        return { id: String(log.id), timestamp: log.created_at, action: log.action, actor: det.user_name || "Système", target: log.entite, details: det.details != null ? String(det.details) : "" };
      }),
      absences: absencesResult.rows.map((a) => ({ id: String(a.id), type: a.type, dateDebut: a.date_debut, dateFin: a.date_fin, statut: a.statut, motif: a.motif || "", validePar: a.valide_par || "", createdAt: a.created_at })),
      pointages: pointagesResult.rows.map((p) => {
        const workMin = effectiveWorkMinutes(p, heureFinEmp);
        return { id: String(p.id), date: p.date, entree: formatTimeHHMM(p.heure_arrivee), sortie: formatTimeHHMM(p.heure_depart), type: pointageDisplayType(p), heuresTravaillees: Number((workMin / 60).toFixed(2)), heuresSup: Number((Number(p.heures_sup_minutes || 0) / 60).toFixed(2)), commentaire: "" };
      }),
      sanctions: sanctionsResult.rows.map((s) => ({ id: String(s.id), type: s.type_sanction, motif: s.motif, dateIncident: s.mois_reference, dateDecision: s.date_traitement || s.created_at, statut: s.statut, decisionneePar: s.decisionnee_par || "" })),
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// STATS GLOBALES
// ═══════════════════════════════════════════════

router.get("/stats/global", async (_req, res, next) => {
  try {
    const [employees, admins, activeUsers, pendingAbsences] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'employee'"),
      query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'admin'"),
      query("SELECT COUNT(*)::int AS total FROM employes WHERE actif = true AND role != 'superadmin'"),
      query("SELECT COUNT(*)::int AS total FROM absences WHERE statut = 'en_attente'"),
    ]);
    res.json({
      employees: employees.rows[0].total, admins: admins.rows[0].total,
      activeUsers: activeUsers.rows[0].total, absenteeismRate: 0,
      pendingAbsences: pendingAbsences.rows[0].total, lateArrivalsCount: 0,
      monthlyOvertimeHours: 0, estimatedOvertimeCost: 0,
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// RÉFÉRENTIELS
// ═══════════════════════════════════════════════

router.get("/referentials", async (_req, res, next) => {
  try {
    const [services, postes] = await Promise.all([
      query("SELECT nom FROM services WHERE actif = true ORDER BY nom"),
      query("SELECT DISTINCT poste FROM employes WHERE poste IS NOT NULL ORDER BY poste"),
    ]);
    res.json({ services: services.rows.map((r) => r.nom), postes: postes.rows.map((r) => r.poste) });
  } catch (err) { next(err); }
});

router.post("/referentials/:kind", async (req, res, next) => {
  try {
    const { kind } = req.params;
    const { value } = req.body || {};
    if (!value || !["services", "postes"].includes(kind))
      return res.status(400).json({ message: "Paramètres invalides." });
    if (kind === "services") {
      await query("INSERT INTO services (nom, actif) VALUES ($1, true) ON CONFLICT (nom) DO UPDATE SET actif = true", [value]);
      const result = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
      return res.json({ items: result.rows.map((r) => r.nom) });
    }
    return res.status(501).json({ message: "Ajout de poste non supporté via cette route." });
  } catch (err) { next(err); }
});

router.delete("/referentials/:kind/:value", async (req, res, next) => {
  try {
    const { kind, value } = req.params;
    if (!["services", "postes"].includes(kind))
      return res.status(400).json({ message: "Paramètres invalides." });
    if (kind === "services") {
      await query("UPDATE services SET actif = false WHERE nom = $1", [value]);
      const result = await query("SELECT nom FROM services WHERE actif = true ORDER BY nom");
      return res.json({ items: result.rows.map((r) => r.nom) });
    }
    return res.status(501).json({ message: "Suppression de poste non supportée via cette route." });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// RH ABSENCES — liste + actions SuperAdmin
// ═══════════════════════════════════════════════

router.get("/rh-absences", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.date_debut, a.date_fin, a.statut, a.motif,
              e.first_name||' '||e.last_name AS employe_name,
              t.libelle AS type_absence,
              v.first_name||' '||v.last_name AS valide_par
       FROM absences a
       JOIN employes e ON e.id = a.employe_id
       JOIN types_absence t ON t.id = a.type_absence_id
       LEFT JOIN employes v ON v.id = a.valide_par
       ORDER BY a.date_debut DESC LIMIT 100`
    );
    res.json(result.rows.map((r) => ({
      id: String(r.id), employeeName: r.employe_name, typeAbsence: r.type_absence,
      dateDebut: r.date_debut, dateFin: r.date_fin, statut: r.statut,
      validePar: r.valide_par || null, motif: r.motif || null,
    })));
  } catch (err) { next(err); }
});

// SuperAdmin outrepasse une décision RH sur une absence
// newStatus: 'approuvee' | 'rejetee' | 'annulee'
router.put("/rh-absences/:id/override", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const { statut } = req.body || {};
    const validStatuts = ["approuvee", "rejetee", "annulee", "en_attente"];
    if (!statut || !validStatuts.includes(statut))
      return res.status(400).json({ message: `Statut invalide. Valeurs acceptées : ${validStatuts.join(", ")}` });

    const result = await query(
      `UPDATE absences
       SET statut = $2, valide_par = $3, date_validation = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, statut, employe_id`,
      [req.params.id, statut, req.auth.sub]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Absence introuvable." });

    const abs = result.rows[0];

    // Notification à l'employé
    const notifType = statut === "approuvee" ? "absence_validee" : statut === "rejetee" ? "absence_rejetee" : "absence_annulee";
    const notifMsg = statut === "approuvee"
      ? "Votre demande d'absence a été approuvée par le SuperAdmin."
      : statut === "rejetee"
      ? "Votre demande d'absence a été rejetée par le SuperAdmin."
      : "Votre demande d'absence a été annulée par le SuperAdmin.";

    await query(
      `INSERT INTO notifications (employe_id, type, titre, message) VALUES ($1,$2,'Décision SuperAdmin',$3)`,
      [abs.employe_id, notifType, notifMsg]
    ).catch(() => {}); // non bloquant

    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "OVERRIDE_ABSENCE", target: `Absence #${abs.id}`,
        details: `Statut modifié → ${statut} (outrepassement SuperAdmin)`, ip: req.ip,
      });
    }
    res.json({ success: true, message: `Absence mise à jour → ${statut}`, absence: abs });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// ACTIVITY (activité récente)
// ═══════════════════════════════════════════════

router.get("/activity", async (_req, res, next) => {
  try {
    // audit_logs : colonnes réelles = user_id, user_role, action, entite, entite_id, details, ip_address
    const rows = await query(
      `SELECT al.id, al.created_at, al.action, al.entite, al.details,
              al.user_role, e.first_name||' '||e.last_name AS user_name
       FROM audit_logs al
       LEFT JOIN employes e ON e.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 20`
    );
    res.json(rows.rows.map((row) => ({
      id: String(row.id),
      timestamp: row.created_at,
      type: row.action.includes("CONFIG") ? "alert"
          : row.action.includes("CREATE") ? "rh_validation"
          : "badge_scan",
      userName: row.user_name || "Système",
      details: normalizeJsonbObject(row.details).details || row.action,
      severity: row.action.includes("DELETE") ? "high" : "low",
    })));
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// AUDIT LOGS  (colonnes réelles de la table)
// user_id, user_role, action, entite, entite_id, details (jsonb), ip_address
// ═══════════════════════════════════════════════

router.get("/audit-logs/export", async (req, res, next) => {
  try {
    const { q, action, actions, dateFrom, dateTo } = req.query;
    const conditions = ["1=1"];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(e.first_name||' '||e.last_name ILIKE $${params.length} OR al.action ILIKE $${params.length} OR al.entite ILIKE $${params.length})`);
    }
    if (action) { params.push(action); conditions.push(`al.action = $${params.length}`); }
    if (actions) {
      const list = String(actions).split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) { params.push(list); conditions.push(`al.action = ANY($${params.length}::text[])`); }
    }
    if (dateFrom) { params.push(dateFrom); conditions.push(`al.created_at >= $${params.length}::timestamptz`); }
    if (dateTo)   { params.push(dateTo);   conditions.push(`al.created_at <= $${params.length}::timestamptz`); }

    const result = await query(
      `SELECT al.id, al.created_at, al.action, al.entite, al.details, al.ip_address, al.user_role,
              e.first_name||' '||e.last_name AS user_name
       FROM audit_logs al LEFT JOIN employes e ON e.id = al.user_id
       WHERE ${conditions.join(" AND ")} ORDER BY al.created_at DESC`,
      params
    );

    const csvLines = [
      ["ID","Date","Utilisateur","Rôle","Action","Entité","Détails","IP"].join(";"),
      ...result.rows.map((r) => {
        const det = normalizeJsonbObject(r.details);
        return [r.id, r.created_at ? new Date(r.created_at).toISOString() : "", r.user_name || "", r.user_role || "", r.action || "", r.entite || "", det.details || "", r.ip_address || ""]
          .map((v) => `"${String(v).replace(/"/g,'""')}"`).join(";");
      }),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send("\uFEFF" + csvLines.join("\r\n"));
  } catch (err) { next(err); }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const {
      q, action, actions, dateFrom, dateTo,
      page = "1", pageSize = "20",
      sortBy = "created_at", sortOrder = "desc",
    } = req.query;

    const allowedSort = { created_at: "al.created_at", user_name: "user_name", action: "al.action", target: "al.entite" };
    const safeSort = allowedSort[sortBy] || "al.created_at";
    const safeOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const conditions = ["1=1"];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(e.first_name||' '||e.last_name ILIKE $${params.length} OR al.action ILIKE $${params.length} OR al.entite ILIKE $${params.length})`);
    }
    if (action) { params.push(action); conditions.push(`al.action = $${params.length}`); }
    if (actions) {
      const list = String(actions).split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) { params.push(list); conditions.push(`al.action = ANY($${params.length}::text[])`); }
    }
    if (dateFrom) { params.push(dateFrom); conditions.push(`al.created_at >= $${params.length}::timestamptz`); }
    if (dateTo)   { params.push(dateTo);   conditions.push(`al.created_at <= $${params.length}::timestamptz`); }

    const whereClause = conditions.join(" AND ");

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM audit_logs al LEFT JOIN employes e ON e.id = al.user_id WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (pageNum - 1) * size;

    params.push(size, offset);
    const result = await query(
      `SELECT al.id, al.created_at, al.action, al.entite, al.details, al.ip_address, al.user_role,
              e.first_name||' '||e.last_name AS user_name
       FROM audit_logs al LEFT JOIN employes e ON e.id = al.user_id
       WHERE ${whereClause}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      items: result.rows.map((r) => {
        const det = normalizeJsonbObject(r.details);
        return {
          id: String(r.id),
          timestamp: r.created_at,
          userName: r.user_name || "Système",
          role: r.user_role || "",
          action: r.action,
          target: r.entite || "",        // "entite" = cible dans votre schéma
          details: det.details || "",
          ip: r.ip_address || "",
        };
      }),
      total, page: pageNum, pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// CONFIGURATION  (table = "configurations", colonnes : cle, valeur)
// ═══════════════════════════════════════════════

const DEFAULT_CONFIG = {
  lateThreshold: 3, lateWarningThreshold: 5, lateSanctionThreshold: 6,
  absenceThreshold: 1, absenceSanctionThreshold: 2,
  defaultEntry: "08:00", defaultExit: "17:00",
  requireJustification: true, notifyOnAbsence3Days: true,
  notifySuspiciousRhValidation: true, dashboardLateMinutesMin: 15,
  overtimeHourlyRateFcfa: 4000,
};

// Mapping frontend key → clé BDD
const CONFIG_MAP = {
  lateThreshold:              "seuil_rappel_retards",
  lateWarningThreshold:       "seuil_avertissement",
  lateSanctionThreshold:      "seuil_sanction",
  absenceThreshold:           "seuil_absence_avert",
  absenceSanctionThreshold:   "seuil_absence_sanction",
  defaultEntry:               "heure_debut_defaut",
  defaultExit:                "heure_fin_defaut",
  requireJustification:       "require_justification",
  notifyOnAbsence3Days:       "notify_absence_3d",
  notifySuspiciousRhValidation: "notify_suspicious_rh",
  dashboardLateMinutesMin:    "dashboard_late_minutes_min",
  overtimeHourlyRateFcfa:     "overtime_hourly_rate_fcfa",
};
const CONFIG_MAP_REVERSE = Object.fromEntries(Object.entries(CONFIG_MAP).map(([k,v]) => [v,k]));

router.get("/config", async (_req, res, next) => {
  try {
    const result = await query("SELECT cle, valeur FROM configurations ORDER BY cle");
    const config = { ...DEFAULT_CONFIG };
    for (const row of result.rows) {
      const frontendKey = CONFIG_MAP_REVERSE[row.cle] || row.cle;
      try { config[frontendKey] = JSON.parse(row.valeur); }
      catch { config[frontendKey] = row.valeur; }
    }
    res.json(config);
  } catch (err) { next(err); }
});

router.put("/config", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const settings = req.body || {};
    for (const [frontendKey, value] of Object.entries(settings)) {
      const dbKey = CONFIG_MAP[frontendKey] || frontendKey;
      await query(
        `UPDATE configurations SET valeur = $2, modifie_par = $3, updated_at = NOW() WHERE cle = $1`,
        [dbKey, String(value), req.auth.sub]
      );
    }
    if (actor) await writeAuditLog({ userId: actor.id, userName: actor.name, role: actor.role, action: "UPDATE_CONFIG", target: "APP_CONFIG", details: "Mise à jour configuration", ip: req.ip });
    res.json({ success: true, message: "Configuration sauvegardée" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// EXPORT GLOBAL
// ═══════════════════════════════════════════════

router.get("/export/global", async (req, res, next) => {
  try {
    const { type, format, month, service: serviceName } = req.query;
    
    // On redirige vers les logiques d'export existantes en adaptant les paramètres
    let serviceId = null;
    if (serviceName && serviceName !== "Tous les Services") {
      const srvResult = await query("SELECT id FROM services WHERE nom = $1", [serviceName]);
      if (srvResult.rowCount) serviceId = srvResult.rows[0].id;
    }

    // On prépare la requête pour rediriger vers les fonctions d'export de routes/exports.mjs
    // Mais pour plus de fiabilité ici, on implémente directement la logique car c'est une route SuperAdmin dédiée
    const isPdf = String(format).toLowerCase() === "pdf";
    
    if (type === "pointages") {
      const startDate = month ? `${month}-01` : new Date().toISOString().slice(0, 8) + "01";
      const endDate = month
        ? new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0]
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        e.poste, s.nom AS service,
                        p.date, p.heure_arrivee, p.heure_depart,
                        p.statut, p.retard_minutes, p.heures_sup_minutes, p.duree_travail_minutes
                 FROM pointages p
                 JOIN employes e ON e.id = p.employe_id
                 JOIN services s ON s.id = e.service_id
                 WHERE p.date >= $1 AND p.date <= $2`;
      const params = [startDate, endDate];
      if (serviceId) { params.push(serviceId); sql += ` AND e.service_id = $${params.length}`; }
      sql += " ORDER BY p.date, e.last_name";

      const result = await query(sql, params);
      
      if (isPdf) {
        const { generateReportPDF } = await import("../utils/pdfHelper.mjs");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="pointages_${month || "all"}.pdf"`);
        await generateReportPDF(res, {
            title: "Rapport Mensuel des Pointages",
            columns: [
              { header: "Matricule", key: "matricule", width: 1.2 },
              { header: "Nom", key: "nom", width: 2.5 },
              { header: "Service", key: "service", width: 1.5 },
              { header: "Date", key: "date", width: 1.2 },
              { header: "Arrivée", key: "heure_arrivee", width: 1 },
              { header: "Départ", key: "heure_depart", width: 1 },
              { header: "H.Sup", key: "heures_sup_minutes", width: 0.8 }
            ],
            rows: result.rows,
            metadata: { period: month || "Toutes", service: serviceName || "Tous les Services" }
        });
        return;
      } else {
        // CSV
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="pointages_${month || "all"}.csv"`);
        res.write("Matricule,Nom,Poste,Service,Date,Arrivee,Depart,Statut,Retard,HSup,Duree\n");
        result.rows.forEach(r => {
          res.write(`${r.matricule},"${r.nom}","${r.poste}","${r.service}",${r.date},${r.heure_arrivee || ""},${r.heure_depart || ""},${r.statut},${r.retard_minutes},${r.heures_sup_minutes},${r.duree_travail_minutes}\n`);
        });
        return res.end();
      }
    }

    if (type === "absences") {
      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        t.libelle AS type_absence,
                        a.date_debut, a.date_fin, a.statut
                 FROM absences a
                 JOIN employes e ON e.id = a.employe_id
                 JOIN types_absence t ON t.id = a.type_absence_id
                 WHERE 1=1`;
      const params = [];
      if (month) {
        params.push(`${month}-01`);
        sql += ` AND a.date_debut >= $${params.length}`;
        const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0];
        params.push(endDate);
        sql += ` AND a.date_debut <= $${params.length}`;
      }
      if (serviceId) { params.push(serviceId); sql += ` AND e.service_id = $${params.length}`; }
      sql += " ORDER BY a.date_debut DESC";

      const result = await query(sql, params);

      if (isPdf) {
        const { generateReportPDF } = await import("../utils/pdfHelper.mjs");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="absences_${month || "all"}.pdf"`);
        await generateReportPDF(res, {
            title: "Rapport des Absences",
            columns: [
              { header: "Matricule", key: "matricule", width: 1.2 },
              { header: "Nom", key: "nom", width: 2.5 },
              { header: "Type", key: "type_absence", width: 2 },
              { header: "Début", key: "date_debut", width: 1.2 },
              { header: "Fin", key: "date_fin", width: 1.2 },
              { header: "Statut", key: "statut", width: 1.2 }
            ],
            rows: result.rows,
            metadata: { period: month || "Toutes", service: serviceName || "Tous les Services" }
        });
        return;
      } else {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="absences_${month || "all"}.csv"`);
        res.write("Matricule,Nom,Type,Debut,Fin,Statut\n");
        result.rows.forEach(r => {
          res.write(`${r.matricule},"${r.nom}","${r.type_absence}",${r.date_debut},${r.date_fin},${r.statut}\n`);
        });
        return res.end();
      }
    }

    if (type === "disciplinaire") {
      let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                        s.type_sanction, s.motif, s.statut, s.mois_reference
                 FROM sanctions s
                 JOIN employes e ON e.id = s.employe_id
                 WHERE 1=1`;
      const params = [];
      if (serviceId) { params.push(serviceId); sql += ` AND e.service_id = $${params.length}`; }
      sql += " ORDER BY s.created_at DESC";

      const result = await query(sql, params);

      if (isPdf) {
        const { generateReportPDF } = await import("../utils/pdfHelper.mjs");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="disciplinaire.pdf"');
        await generateReportPDF(res, {
            title: "Audit Disciplinaire & Sanctions",
            columns: [
              { header: "Matricule", key: "matricule", width: 1.2 },
              { header: "Nom", key: "nom", width: 2.5 },
              { header: "Type", key: "type_sanction", width: 1.5 },
              { header: "Motif", key: "motif", width: 2.5 },
              { header: "Mois", key: "mois_reference", width: 1.2 }
            ],
            rows: result.rows
        });
        return;
      } else {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="disciplinaire.csv"');
        res.write("Matricule,Nom,Type,Motif,Mois\n");
        result.rows.forEach(r => {
          res.write(`${r.matricule},"${r.nom}","${r.type_sanction}","${r.motif}",${r.mois_reference}\n`);
        });
        return res.end();
      }
    }

    res.status(400).json({ message: "Type d'export inconnu." });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════
// RESET COUNTERS (réinitialisation des compteurs)
// Remplace l'ancien /reset-users
// ═══════════════════════════════════════════════

router.post("/reset-counters", async (req, res, next) => {
  try {
    const actor = await getActor(req);
    const currentUserId = req.auth.sub;

    // 1. Vider les tables de logs et notifications
    await query("DELETE FROM audit_logs");
    await query("DELETE FROM notifications");
    await query("DELETE FROM qr_tokens");

    // 2. Vider les données métier (pointages, sanctions)
    await query("DELETE FROM pointages");
    await query("DELETE FROM sanctions");

    // 3. Vider les absences et justificatifs
    // Justificatifs d'abord car ils pointent vers absences et employes
    await query("DELETE FROM justificatifs");
    await query("DELETE FROM absences");

    // 4. Supprimer tous les comptes SAUF le SuperAdmin actuel
    await query("DELETE FROM employes WHERE id != $1 AND role != 'superadmin'", [currentUserId]);

    // On pourrait aussi vider les configurations personnalisées si besoin, 
    // mais on garde les services car le SuperAdmin y est rattaché.

    if (actor) {
      // On recrée un log pour cette action précise après avoir vidé la table
      await writeAuditLog({
        userId: currentUserId,
        userName: actor.name,
        role: actor.role,
        action: "HARD_RESET",
        target: "SYSTEM",
        details: "Réinitialisation totale de l'application effectuée",
        ip: req.ip,
      });
    }

    res.json({ success: true, message: "L'application a été entièrement réinitialisée." });
  } catch (err) {
    next(err);
  }
});

// ⚠️  export default TOUJOURS EN DERNIER
// ═══════════════════════════════════════════════
export default router;
