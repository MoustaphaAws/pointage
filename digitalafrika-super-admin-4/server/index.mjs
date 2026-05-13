import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import { initDb, query } from "./db.mjs";
import { requireAuth, requireSuperAdmin, signToken } from "./auth.mjs";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

function fullName(row) {
  return `${row.first_name} ${row.last_name}`.trim();
}

async function writeAuditLog({ user, action, target, details, ip }) {
  await query(
    `
      INSERT INTO audit_logs (user_id, user_name, role, action, target, details, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [user.id, fullName(user), user.role, action, target, details, ip || null]
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  const result = await query(
    "SELECT * FROM employes WHERE email = $1 AND active = true LIMIT 1",
    [String(email).toLowerCase()]
  );
  if (!result.rowCount) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }
  if (user.role !== "superadmin") {
    return res.status(403).json({ message: "Seul un SuperAdmin peut se connecter ici." });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: String(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      service: user.service,
      active: user.active,
      adminPermissions: user.admin_permissions || undefined,
    },
  });
});

app.use("/api/admin", requireAuth, requireSuperAdmin);

app.get("/api/admin/admins", async (_req, res) => {
  const result = await query(
    `
      SELECT id, first_name, last_name, email, role, service, poste, active, admin_permissions, created_at
      FROM employes
      WHERE role IN ('admin', 'employee')
      ORDER BY created_at DESC
    `
  );
  res.json(
    result.rows.map((row) => ({
      id: String(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      service: row.service,
      poste: row.poste || "",
      active: row.active,
      adminPermissions: row.admin_permissions || undefined,
      createdAt: row.created_at,
    }))
  );
});

app.post("/api/admin/admins", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const { firstName, lastName, email, role, service, poste, password, adminPermissions } = req.body || {};
  if (!firstName || !lastName || !email || !service || !password) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }
  const safeRole = role === "admin" ? "admin" : "employee";
  const hash = await bcrypt.hash(password, 10);
  const insert = await query(
    `
      INSERT INTO employes (first_name, last_name, email, password_hash, role, service, poste, active, admin_permissions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8::jsonb)
      RETURNING id, first_name, last_name, email, role, service, poste, active, admin_permissions, created_at
    `,
    [firstName, lastName, String(email).toLowerCase(), hash, safeRole, service, poste || null, adminPermissions ? JSON.stringify(adminPermissions) : '{}']
  );
  const created = insert.rows[0];

  await writeAuditLog({
    user: actor,
    action: "CREATE_USER",
    target: `${created.first_name} ${created.last_name}`,
    details: `Création compte ${safeRole}`,
    ip: req.ip,
  });

  res.status(201).json({
    id: String(created.id),
    firstName: created.first_name,
    lastName: created.last_name,
    email: created.email,
    role: created.role,
    service: created.service,
    poste: created.poste || "",
    active: created.active,
    adminPermissions: created.admin_permissions || undefined,
    createdAt: created.created_at,
  });
});

app.put("/api/admin/admins/:id", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const { firstName, lastName, service, poste, role, adminPermissions } = req.body || {};
  const safeRole = role ? (role === "admin" ? "admin" : "employee") : null;
  const update = await query(
    `
      UPDATE employes
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          service = COALESCE($3, service),
          poste = COALESCE($4, poste),
          role = CASE WHEN $5::text IS NULL THEN role ELSE $5 END,
          admin_permissions = CASE WHEN $7::jsonb IS NULL THEN admin_permissions ELSE $7::jsonb END
      WHERE id = $6 AND role IN ('admin', 'employee')
      RETURNING *
    `,
    [firstName || null, lastName || null, service || null, poste || null, safeRole, id, adminPermissions !== undefined ? JSON.stringify(adminPermissions) : null]
  );
  if (!update.rowCount) {
    return res.status(404).json({ message: "Utilisateur introuvable." });
  }
  const updated = update.rows[0];
  await writeAuditLog({
    user: actor,
    action: "UPDATE_USER",
    target: fullName(updated),
    details: "Mise à jour profil employé/admin",
    ip: req.ip,
  });
  res.json({ success: true });
});

app.get("/api/admin/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  const employee = await query(
    `
      SELECT id, first_name, last_name, email, role, service, poste, active, admin_permissions, created_at
      FROM employes
      WHERE id = $1 AND role IN ('admin', 'employee')
      LIMIT 1
    `,
    [id]
  );
  if (!employee.rowCount) {
    return res.status(404).json({ message: "Employé introuvable." });
  }

  const row = employee.rows[0];
  const fullNameTarget = `${row.first_name} ${row.last_name}`.trim();

  const [activity, absences, pointages, sanctions] = await Promise.all([
    query(
      `
        SELECT id, created_at, user_name, action, target, details
        FROM audit_logs
        WHERE user_id = $1 OR target = $2
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [id, fullNameTarget]
    ),
    query(
      `
        SELECT a.id, a.type, a.date_debut, a.date_fin, a.statut, a.motif, a.created_at,
               e.first_name || ' ' || e.last_name as valide_par_nom
        FROM absences a
        LEFT JOIN employes e ON a.valide_par = e.id
        WHERE a.employe_id = $1
        ORDER BY a.date_debut DESC
        LIMIT 20
      `,
      [id]
    ),
    query(
      `
        SELECT id, date_pointage, heure_entree, heure_sortie, type_pointage,
               heures_travaillees, heures_supplementaires, commentaire
        FROM pointages
        WHERE employe_id = $1
        ORDER BY date_pointage DESC
        LIMIT 30
      `,
      [id]
    ),
    query(
      `
        SELECT s.id, s.type, s.motif, s.date_incident, s.date_decision, s.statut,
               e.first_name || ' ' || e.last_name as decisionnee_par_nom
        FROM sanctions s
        LEFT JOIN employes e ON s.decisionnee_par = e.id
        WHERE s.employe_id = $1
        ORDER BY s.date_decision DESC
        LIMIT 10
      `,
      [id]
    )
  ]);

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
      adminPermissions: row.admin_permissions || undefined,
      createdAt: row.created_at,
    },
    stats: {
      totalAbsences: absences.rowCount,
      totalPointages: pointages.rowCount,
      totalSanctions: sanctions.rowCount,
      joursAbsence: absences.rows.reduce((acc, a) => acc + Math.ceil((new Date(a.date_fin) - new Date(a.date_debut)) / (1000 * 60 * 60 * 24)), 0),
      heuresTravaillees: pointages.rows.reduce((acc, p) => acc + parseFloat(p.heures_travaillees || 0), 0).toFixed(2),
      heuresSup: pointages.rows.reduce((acc, p) => acc + parseFloat(p.heures_supplementaires || 0), 0).toFixed(2),
    },
    activity: activity.rows.map((log) => ({
      id: String(log.id),
      timestamp: log.created_at,
      action: log.action,
      actor: log.user_name,
      target: log.target,
      details: log.details,
    })),
    absences: absences.rows.map((a) => ({
      id: String(a.id),
      type: a.type,
      dateDebut: a.date_debut,
      dateFin: a.date_fin,
      statut: a.statut,
      motif: a.motif,
      validePar: a.valide_par_nom,
      createdAt: a.created_at,
    })),
    pointages: pointages.rows.map((p) => ({
      id: String(p.id),
      date: p.date_pointage,
      entree: p.heure_entree,
      sortie: p.heure_sortie,
      type: p.type_pointage,
      heuresTravaillees: p.heures_travaillees,
      heuresSup: p.heures_supplementaires,
      commentaire: p.commentaire,
    })),
    sanctions: sanctions.rows.map((s) => ({
      id: String(s.id),
      type: s.type,
      motif: s.motif,
      dateIncident: s.date_incident,
      dateDecision: s.date_decision,
      statut: s.statut,
      decisionneePar: s.decisionnee_par_nom,
    })),
  });
});

app.get("/api/admin/me", async (req, res) => {
  const result = await query(
    `
      SELECT id, first_name, last_name, email, role, service, poste, active, created_at
      FROM employes
      WHERE id = $1 AND role = 'superadmin'
      LIMIT 1
    `,
    [req.auth.sub]
  );
  if (!result.rowCount) {
    return res.status(404).json({ message: "SuperAdmin introuvable." });
  }
  const me = result.rows[0];
  res.json({
    id: String(me.id),
    firstName: me.first_name,
    lastName: me.last_name,
    email: me.email,
    role: me.role,
    service: me.service,
    poste: me.poste || "",
    active: me.active,
    createdAt: me.created_at,
  });
});

app.put("/api/admin/me", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const { firstName, lastName, email, service, poste, password } = req.body || {};

  if (password && String(password).length < 8) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(String(password), 10);
  }

  const update = await query(
    `
      UPDATE employes
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          service = COALESCE($4, service),
          poste = COALESCE($5, poste),
          password_hash = COALESCE($6, password_hash)
      WHERE id = $7 AND role = 'superadmin'
      RETURNING id, first_name, last_name, email, role, service, poste, active, created_at
    `,
    [
      firstName || null,
      lastName || null,
      email ? String(email).toLowerCase() : null,
      service || null,
      poste || null,
      passwordHash,
      req.auth.sub,
    ]
  );
  if (!update.rowCount) {
    return res.status(404).json({ message: "SuperAdmin introuvable." });
  }

  await writeAuditLog({
    user: actor,
    action: "UPDATE_PROFILE",
    target: fullName(update.rows[0]),
    details: "Mise à jour du profil SuperAdmin",
    ip: req.ip,
  });

  const updated = update.rows[0];
  res.json({
    id: String(updated.id),
    firstName: updated.first_name,
    lastName: updated.last_name,
    email: updated.email,
    role: updated.role,
    service: updated.service,
    poste: updated.poste || "",
    active: updated.active,
    createdAt: updated.created_at,
  });
});

app.get("/api/admin/referentials", async (_req, res) => {
  const keys = await query(
    `
      SELECT key, value
      FROM configurations
      WHERE key IN ('services', 'postes')
    `
  );
  const map = { services: [], postes: [] };
  for (const row of keys.rows) {
    map[row.key] = Array.isArray(row.value) ? row.value : [];
  }
  res.json(map);
});

async function updateReferentialList(key, nextValues, actor, req) {
  await query(
    `
      INSERT INTO configurations (key, value, modified_by)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, modified_by = EXCLUDED.modified_by, updated_at = NOW()
    `,
    [key, JSON.stringify(nextValues), actor.id]
  );
  await writeAuditLog({
    user: actor,
    action: "UPDATE_CONFIG",
    target: key.toUpperCase(),
    details: `Mise à jour du référentiel ${key}`,
    ip: req.ip,
  });
}

app.post("/api/admin/referentials/:kind", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const kind = req.params.kind === "postes" ? "postes" : req.params.kind === "services" ? "services" : null;
  if (!kind) return res.status(400).json({ message: "Référentiel invalide." });
  const { value } = req.body || {};
  if (!value || !String(value).trim()) return res.status(400).json({ message: "Valeur requise." });

  const current = await query("SELECT value FROM configurations WHERE key = $1", [kind]);
  const items = current.rowCount && Array.isArray(current.rows[0].value) ? current.rows[0].value : [];
  const normalized = String(value).trim();
  if (items.includes(normalized)) return res.status(409).json({ message: "Valeur déjà existante." });
  const next = [...items, normalized];
  await updateReferentialList(kind, next, actor, req);
  res.status(201).json({ items: next });
});

app.delete("/api/admin/referentials/:kind/:value", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const kind = req.params.kind === "postes" ? "postes" : req.params.kind === "services" ? "services" : null;
  if (!kind) return res.status(400).json({ message: "Référentiel invalide." });
  const value = decodeURIComponent(req.params.value);

  // Empêcher suppression si valeur déjà utilisée
  if (kind === "services") {
    const used = await query(
      `SELECT COUNT(*)::int AS total FROM employes WHERE role IN ('employee','admin') AND service = $1`,
      [value]
    );
    if (used.rows[0].total > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer ce service : il est utilisé par ${used.rows[0].total} compte(s).`,
      });
    }
  }
  if (kind === "postes") {
    const used = await query(
      `SELECT COUNT(*)::int AS total FROM employes WHERE role IN ('employee','admin') AND poste = $1`,
      [value]
    );
    if (used.rows[0].total > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer ce poste : il est utilisé par ${used.rows[0].total} compte(s).`,
      });
    }
  }

  const current = await query("SELECT value FROM configurations WHERE key = $1", [kind]);
  const items = current.rowCount && Array.isArray(current.rows[0].value) ? current.rows[0].value : [];
  const next = items.filter((item) => item !== value);
  await updateReferentialList(kind, next, actor, req);
  res.json({ items: next });
});

app.put("/api/admin/admins/:id/suspend", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const result = await query(
    `
      UPDATE employes
      SET active = false
      WHERE id = $1 AND role IN ('admin', 'employee')
      RETURNING *
    `,
    [id]
  );
  if (!result.rowCount) {
    return res.status(404).json({ message: "Utilisateur introuvable." });
  }
  const target = result.rows[0];
  await writeAuditLog({
    user: actor,
    action: "SUSPEND_USER",
    target: fullName(target),
    details: "Désactivation du compte",
    ip: req.ip,
  });
  res.json({ success: true });
});

app.put("/api/admin/admins/:id/reset-password", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  const hash = await bcrypt.hash(String(password), 10);
  const result = await query(
    `
      UPDATE employes
      SET password_hash = $1
      WHERE id = $2 AND role IN ('admin', 'employee')
      RETURNING *
    `,
    [hash, id]
  );
  if (!result.rowCount) {
    return res.status(404).json({ message: "Utilisateur introuvable." });
  }

  const target = result.rows[0];
  await writeAuditLog({
    user: actor,
    action: "RESET_PASSWORD",
    target: fullName(target),
    details: "Réinitialisation du mot de passe",
    ip: req.ip,
  });
  res.json({ success: true });
});

app.delete("/api/admin/admins/:id", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const result = await query(
    `DELETE FROM employes WHERE id = $1 AND role IN ('admin', 'employee') RETURNING *`,
    [id]
  );
  if (!result.rowCount) {
    return res.status(404).json({ message: "Utilisateur introuvable." });
  }
  const deleted = result.rows[0];
  await writeAuditLog({
    user: actor,
    action: "DELETE_USER",
    target: fullName(deleted),
    details: "Suppression définitive du compte",
    ip: req.ip,
  });
  res.json({ success: true });
});

app.get("/api/admin/config", async (_req, res) => {
  const keys = await query(
    "SELECT key, value FROM configurations ORDER BY key"
  );
  const config = {};
  for (const row of keys.rows) {
    config[row.key] = row.value;
  }
  res.json(config);
});

app.put("/api/admin/config", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const body = req.body || {};
  const entries = Object.entries(body);
  for (const [key, value] of entries) {
    await query(
      `
      INSERT INTO configurations (key, value, modified_by)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, modified_by = EXCLUDED.modified_by, updated_at = NOW()
      `,
      [key, JSON.stringify(value), actor.id]
    );
  }
  await writeAuditLog({
    user: actor,
    action: "UPDATE_CONFIG",
    target: "CONFIG_GLOBAL",
    details: "Mise à jour des paramètres système",
    ip: req.ip,
  });
  res.json({ success: true });
});

app.get("/api/admin/audit-logs", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 20)));
  const q = String(req.query.q || "").trim().toLowerCase();
  const action = String(req.query.action || "").trim().toUpperCase();
  const actionsRaw = String(req.query.actions || "").trim().toUpperCase();
  const dateFrom = String(req.query.dateFrom || "").trim();
  const dateTo = String(req.query.dateTo || "").trim();
  const sortByRaw = String(req.query.sortBy || "created_at").trim();
  const sortOrderRaw = String(req.query.sortOrder || "desc").trim().toLowerCase();
  const sortMap = {
    created_at: "created_at",
    user_name: "user_name",
    action: "action",
    target: "target",
  };
  const sortBy = sortMap[sortByRaw] || "created_at";
  const sortOrder = sortOrderRaw === "asc" ? "ASC" : "DESC";

  const values = [];
  const where = [];
  if (q) {
    values.push(`%${q}%`);
    const idx = values.length;
    where.push(`(LOWER(user_name) LIKE $${idx} OR LOWER(target) LIKE $${idx} OR LOWER(details) LIKE $${idx})`);
  }
  if (actionsRaw) {
    const actions = actionsRaw
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (actions.length) {
      const placeholders = actions.map((_a, i) => `$${values.length + i + 1}`);
      values.push(...actions);
      where.push(`action IN (${placeholders.join(", ")})`);
    }
  } else if (action) {
    values.push(action);
    where.push(`action = $${values.length}`);
  }
  if (dateFrom) {
    values.push(dateFrom);
    where.push(`created_at::date >= $${values.length}::date`);
  }
  if (dateTo) {
    values.push(dateTo);
    where.push(`created_at::date <= $${values.length}::date`);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRows = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM audit_logs
      ${whereClause}
    `,
    values
  );
  const total = countRows.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  values.push(pageSize);
  values.push(offset);

  const rows = await query(
    `
      SELECT id, created_at, user_id, user_name, action, target, details
      FROM audit_logs
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );
  res.json({
    items: rows.rows.map((log) => ({
      id: String(log.id),
      timestamp: log.created_at,
      userId: String(log.user_id || ""),
      userName: log.user_name,
      action: log.action,
      target: log.target,
      details: log.details,
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
  });
});

app.get("/api/admin/audit-logs/export", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const action = String(req.query.action || "").trim().toUpperCase();
  const actionsRaw = String(req.query.actions || "").trim().toUpperCase();
  const dateFrom = String(req.query.dateFrom || "").trim();
  const dateTo = String(req.query.dateTo || "").trim();

  const values = [];
  const where = [];
  if (q) {
    values.push(`%${q}%`);
    const idx = values.length;
    where.push(`(LOWER(user_name) LIKE $${idx} OR LOWER(target) LIKE $${idx} OR LOWER(details) LIKE $${idx})`);
  }
  if (actionsRaw) {
    const actions = actionsRaw
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (actions.length) {
      const placeholders = actions.map((_a, i) => `$${values.length + i + 1}`);
      values.push(...actions);
      where.push(`action IN (${placeholders.join(", ")})`);
    }
  } else if (action) {
    values.push(action);
    where.push(`action = $${values.length}`);
  }
  if (dateFrom) {
    values.push(dateFrom);
    where.push(`created_at::date >= $${values.length}::date`);
  }
  if (dateTo) {
    values.push(dateTo);
    where.push(`created_at::date <= $${values.length}::date`);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.csv"');
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  res.write("timestamp,user_name,action,target,details\n");

  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const batchValues = [...values, pageSize, offset];
    const rows = await query(
      `
        SELECT created_at, user_name, action, target, details
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${batchValues.length - 1}
        OFFSET $${batchValues.length}
      `,
      batchValues
    );
    if (!rows.rowCount) break;
    for (const row of rows.rows) {
      res.write(
        [
          escape(row.created_at),
          escape(row.user_name),
          escape(row.action),
          escape(row.target),
          escape(row.details),
        ].join(",") + "\n"
      );
    }
    offset += pageSize;
  }
  res.end();
});

app.get("/api/admin/stats/global", async (_req, res) => {
  const employees = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'employee'");
  const admins = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role = 'admin'");
  const activeUsers = await query("SELECT COUNT(*)::int AS total FROM employes WHERE active = true");
  const totalUsers = await query("SELECT COUNT(*)::int AS total FROM employes WHERE role IN ('employee', 'admin')");
  
  // Calcul du taux d'absentéisme réel (basé sur les absences approuvées du mois courant)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const absencesResult = await query(
    `
      SELECT 
        COUNT(DISTINCT employe_id)::int AS total_absents,
        SUM(
          CASE 
            WHEN date_fin >= date_debut THEN (date_fin - date_debut) + 1
            ELSE 1
          END
        )::int AS total_jours_absence
      FROM absences 
      WHERE statut = 'approuvee' 
        AND to_char(date_debut, 'YYYY-MM') = $1
    `,
    [currentMonth]
  );
  
  const totalEmp = employees.rows[0].total || 1;
  const absentEmployees = absencesResult.rows[0].total_absents || 0;
  const absenteeismRate = Number(((absentEmployees / totalEmp) * 100).toFixed(1));
  
  // Heures supplémentaires réelles du mois (basé sur les pointages)
  const overtimeResult = await query(
    `
      SELECT 
        COALESCE(SUM(heures_supplementaires), 0)::float AS total_heures_sup,
        COALESCE(SUM(heures_travaillees), 0)::float AS total_heures_travaillees
      FROM pointages 
      WHERE to_char(date_pointage, 'YYYY-MM') = $1
    `,
    [currentMonth]
  );
  
  const monthlyOvertimeHours = Number((overtimeResult.rows[0].total_heures_sup || 0).toFixed(1));
  
  // Coût estimé des heures sup (taux moyen de 3000 FCFA/heure)
  const hourlyRate = 3000;
  const estimatedOvertimeCost = Math.round(monthlyOvertimeHours * hourlyRate);
  
  // Retards (pointages de type 'retard' du mois)
  const lateResult = await query(
    `
      SELECT COUNT(*)::int AS total 
      FROM pointages 
      WHERE type_pointage = 'retard' 
        AND to_char(date_pointage, 'YYYY-MM') = $1
    `,
    [currentMonth]
  );
  
  // Absences en attente
  const pendingAbsencesResult = await query(
    `
      SELECT COUNT(*)::int AS total 
      FROM absences 
      WHERE statut = 'en_attente'
    `
  );
  
  const serviceActivityRows = await query(
    `
      SELECT service, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active = true)::int AS active
      FROM employes
      WHERE role IN ('employee', 'admin')
      GROUP BY service
      ORDER BY service ASC
    `
  );
  
  const criticalRows = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM audit_logs
      WHERE action IN ('DELETE_USER', 'SUSPEND_USER', 'RH_OVERRIDE')
        AND created_at >= NOW() - INTERVAL '24 hours'
    `
  );

  res.json({
    employees: employees.rows[0].total,
    admins: admins.rows[0].total,
    activeUsers: activeUsers.rows[0].total,
    absenteeismRate,
    pendingAbsences: pendingAbsencesResult.rows[0].total,
    lateArrivalsCount: lateResult.rows[0].total,
    monthlyOvertimeHours,
    estimatedOvertimeCost,
    serviceActivity: serviceActivityRows.rows.map((row) => ({
      name: row.service,
      current: row.active,
      total: row.total,
    })),
    criticalAlerts: criticalRows.rows[0].total,
  });
});

app.get("/api/admin/activity", async (_req, res) => {
  const rows = await query(
    `
      SELECT id, created_at, user_name, action, details
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 20
    `
  );
  const items = rows.rows.map((row) => ({
    id: String(row.id),
    timestamp: row.created_at,
    type: row.action.includes("CONFIG")
      ? "alert"
      : row.action.includes("CREATE")
      ? "rh_validation"
      : "badge_scan",
    userName: row.user_name,
    details: row.details,
    severity: row.action.includes("DELETE") ? "high" : "low",
  }));
  res.json(items);
});

app.get("/api/admin/rh-absences", async (_req, res) => {
  const rows = await query(
    `
      SELECT id, created_at, user_name, action, target, details
      FROM audit_logs
      WHERE action IN ('SUSPEND_USER', 'DELETE_USER', 'RESET_PASSWORD', 'RH_OVERRIDE')
      ORDER BY created_at DESC
      LIMIT 100
    `
  );

  const mapped = rows.rows.map((row) => {
    let statut = "approuvee";
    if (row.action === "DELETE_USER") statut = "rejetee";
    if (row.action === "RH_OVERRIDE") statut = "annulee";
    return {
      id: String(row.id),
      employeeName: row.target,
      typeAbsence: row.action.replaceAll("_", " "),
      dateDebut: row.created_at,
      dateFin: row.created_at,
      statut,
      validePar: row.user_name,
      motif: row.details,
    };
  });
  res.json(mapped);
});

app.put("/api/admin/rh-absences/:id/override", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const { statut } = req.body || {};
  const existing = await query("SELECT target, details FROM audit_logs WHERE id = $1 LIMIT 1", [id]);
  if (!existing.rowCount) {
    return res.status(404).json({ message: "Entrée de supervision introuvable." });
  }

  await writeAuditLog({
    user: actor,
    action: "RH_OVERRIDE",
    target: existing.rows[0].target,
    details: `Override SuperAdmin: ${String(statut || "annulee")}. Source: ${existing.rows[0].details}`,
    ip: req.ip,
  });
  res.json({ success: true });
});

app.get("/api/admin/export/global", async (req, res) => {
  const type = String(req.query.type || "pointages");
  const format = String(req.query.format || "csv").toLowerCase();
  const service = String(req.query.service || "all");
  const month = String(req.query.month || "");

  const where = [];
  const values = [];
  if (service && service !== "all") {
    values.push(service);
    where.push(`service = $${values.length}`);
  }
  if (month) {
    values.push(`${month}%`);
    where.push(`to_char(created_at, 'YYYY-MM-DD') LIKE $${values.length}`);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let rows = [];
  if (type === "absences") {
    rows = (
      await query(
        `
          SELECT first_name || ' ' || last_name AS user_name, service, poste, active, created_at
          FROM employes
          ${whereClause}
          ORDER BY created_at DESC
        `,
        values
      )
    ).rows;
  } else if (type === "disciplinaire") {
    rows = (
      await query(
        `
          SELECT user_name, action, target, details, created_at
          FROM audit_logs
          WHERE action IN ('SUSPEND_USER', 'DELETE_USER', 'RESET_PASSWORD')
          ${month ? `AND to_char(created_at, 'YYYY-MM') = $1` : ""}
          ORDER BY created_at DESC
        `,
        month ? [month] : []
      )
    ).rows;
  } else {
    const auditWhere = [];
    const auditValues = [];
    if (month) {
      auditValues.push(month);
      auditWhere.push(`to_char(created_at, 'YYYY-MM') = $${auditValues.length}`);
    }
    const auditWhereClause = auditWhere.length ? `WHERE ${auditWhere.join(" AND ")}` : "";
    rows = (
      await query(
        `
          SELECT user_name, action, target, details, created_at
          FROM audit_logs
          ${auditWhereClause}
          ORDER BY created_at DESC
        `,
        auditValues
      )
    ).rows;
  }

  const headers = Object.keys(rows[0] || { empty: "" });
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: 'portrait' });
    doc.pipe(res);
    
    const pageWidth = doc.page.width - 80;
    const now = new Date();
    const logoPath = process.env.COMPANY_LOGO_PATH || null;
    
    // Header avec logo (si disponible)
    if (logoPath && require('fs').existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 40, { width: 80 });
      } catch {
        // Si le logo ne charge pas, on continue sans
      }
    }
    
    // Titre du rapport
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('RAPPORT', 140, 40);
    doc.fontSize(14).font('Helvetica').fillColor('#64748b');
    doc.text(getReportTypeLabel(type), 140, 65);
    
    // Ligne de séparation
    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc.moveTo(40, 100).lineTo(pageWidth + 40, 100).stroke();
    
    // Informations du rapport
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`Généré le: ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 40, 115);
    doc.text(`Période: ${month ? new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Toutes périodes'}`, 40, 130);
    doc.text(`Service: ${service === 'all' ? 'Tous les services' : service}`, 40, 145);
    doc.text(`Nombre d'enregistrements: ${rows.length}`, 40, 160);
    
    // Ligne de séparation
    doc.moveTo(40, 180).lineTo(pageWidth + 40, 180).stroke();
    
    // Contenu du rapport sous forme de tableau
    if (rows.length > 0) {
      let y = 200;
      const rowHeight = 20;
      const colWidth = pageWidth / Math.min(4, Object.keys(rows[0]).length);
      
      // En-têtes du tableau
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
      const headers = Object.keys(rows[0]);
      headers.slice(0, 4).forEach((header, i) => {
        doc.text(header.toUpperCase(), 40 + i * colWidth, y, { width: colWidth - 5 });
      });
      
      y += rowHeight;
      doc.strokeColor('#cbd5e1').lineWidth(0.5);
      doc.moveTo(40, y - 5).lineTo(pageWidth + 40, y - 5).stroke();
      
      // Lignes de données
      doc.fontSize(8).font('Helvetica').fillColor('#334155');
      const printableRows = rows.slice(0, 60);
      
      printableRows.forEach((row, idx) => {
        if (y > 750) {
          doc.addPage();
          y = 40;
          // Ré-en-tête sur nouvelle page
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
          headers.slice(0, 4).forEach((header, i) => {
            doc.text(header.toUpperCase(), 40 + i * colWidth, y, { width: colWidth - 5 });
          });
          y += rowHeight;
        }
        
        // Alternance de couleurs de fond
        if (idx % 2 === 0) {
          doc.fillColor('#f8fafc').rect(40, y - 2, pageWidth, rowHeight - 2).fill();
        }
        
        doc.fillColor('#334155');
        headers.slice(0, 4).forEach((header, i) => {
          let value = row[header];
          if (value === null || value === undefined) value = '-';
          if (typeof value === 'boolean') value = value ? 'Oui' : 'Non';
          if (typeof value === 'object') value = JSON.stringify(value);
          const strValue = String(value).substring(0, 25);
          doc.text(strValue, 40 + i * colWidth, y, { width: colWidth - 5 });
        });
        
        y += rowHeight;
      });
      
      if (rows.length > printableRows.length) {
        y += 10;
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#94a3b8');
        doc.text(`... et ${rows.length - printableRows.length} enregistrements supplémentaires`, 40, y);
      }
    } else {
      doc.fontSize(12).font('Helvetica-Oblique').fillColor('#94a3b8');
      doc.text('Aucune donnée disponible pour cette période.', 40, 250, { align: 'center' });
    }
    
    // Pied de page
    const footerY = doc.page.height - 50;
    doc.strokeColor('#e2e8f0').lineWidth(0.5);
    doc.moveTo(40, footerY - 10).lineTo(pageWidth + 40, footerY - 10).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
    doc.text('OnTime — Système de Pointage', 40, footerY, { align: 'center' });
    doc.text('Document confidentiel', 40, footerY + 12, { align: 'center' });
    
    doc.end();
    return;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.csv"`);
  res.send(csv);
});

function getReportTypeLabel(type) {
  const labels = {
    absences: 'Rapport des Absences',
    pointages: 'Registre des Pointages',
    disciplinaire: 'Audit Disciplinaire',
  };
  return labels[type] || 'Rapport';
}

async function seedIfNeeded() {
  const check = await query("SELECT id FROM employes WHERE role = 'superadmin' LIMIT 1");
  if (!check.rowCount) {
    const hash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || "password123", 10);
    await query(
      `
        INSERT INTO employes (first_name, last_name, email, password_hash, role, service, active)
        VALUES ('Super', 'Admin', $1, $2, 'superadmin', 'Direction', true)
      `,
      [process.env.SUPERADMIN_EMAIL || "boss@digitalafrika.com", hash]
    );
  }

  const defaults = [
    ["lateThreshold", 3],
    ["absenceThreshold", 5],
    ["defaultEntry", "08:30"],
    ["defaultExit", "17:30"],
    ["requireJustification", true],
    ["notifyOnAbsence3Days", true],
    ["notifySuspiciousRhValidation", true],
    ["services", ["service commercial", "service administratif", "logistique", "IT"]],
    ["postes", ["Directeur general", "responsable administratif", "Irformaticien", "teleoperateur", "community managemen"]],
  ];
  for (const [key, value] of defaults) {
    await query(
      `
        INSERT INTO configurations (key, value, description)
        VALUES ($1, $2::jsonb, 'Seed default')
        ON CONFLICT (key) DO NOTHING
      `,
      [key, JSON.stringify(value)]
    );
  }
}

async function bootstrap() {
  await initDb();
  await seedIfNeeded();
  app.listen(PORT, () => {
    console.log(`API SuperAdmin lancée sur http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Erreur de démarrage API:", err);
  process.exit(1);
});
