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
      badgeUid: user.badge_uid || "-",
    },
  });
});

app.use("/api/admin", requireAuth, requireSuperAdmin);

app.get("/api/admin/admins", async (_req, res) => {
  const result = await query(
    `
      SELECT id, first_name, last_name, email, role, service, poste, active, badge_uid, created_at
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
      badgeUid: row.badge_uid || "-",
      createdAt: row.created_at,
    }))
  );
});

app.post("/api/admin/admins", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const { firstName, lastName, email, role, service, poste, badgeUid, password } = req.body || {};
  if (!firstName || !lastName || !email || !service || !password) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }
  const safeRole = role === "admin" ? "admin" : "employee";
  const hash = await bcrypt.hash(password, 10);
  const insert = await query(
    `
      INSERT INTO employes (first_name, last_name, email, password_hash, role, service, poste, badge_uid, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING id, first_name, last_name, email, role, service, poste, active, badge_uid, created_at
    `,
    [firstName, lastName, String(email).toLowerCase(), hash, safeRole, service, poste || null, badgeUid || null]
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
    badgeUid: created.badge_uid || "-",
    createdAt: created.created_at,
  });
});

app.put("/api/admin/admins/:id", async (req, res) => {
  const actorResult = await query("SELECT * FROM employes WHERE id = $1 LIMIT 1", [req.auth.sub]);
  const actor = actorResult.rows[0];
  const id = Number(req.params.id);
  const { firstName, lastName, service, poste, role, badgeUid } = req.body || {};
  const safeRole = role ? (role === "admin" ? "admin" : "employee") : null;
  const update = await query(
    `
      UPDATE employes
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          service = COALESCE($3, service),
          poste = COALESCE($4, poste),
          role = CASE WHEN $5::text IS NULL THEN role ELSE $5 END,
          badge_uid = COALESCE($6, badge_uid)
      WHERE id = $7 AND role IN ('admin', 'employee')
      RETURNING *
    `,
    [firstName || null, lastName || null, service || null, poste || null, safeRole, badgeUid || null, id]
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
  const createUsers = await query("SELECT COUNT(*)::int AS total FROM audit_logs WHERE action = 'CREATE_USER'");
  const suspendUsers = await query("SELECT COUNT(*)::int AS total FROM audit_logs WHERE action = 'SUSPEND_USER'");
  const updateConfig = await query("SELECT COUNT(*)::int AS total FROM audit_logs WHERE action = 'UPDATE_CONFIG'");
  const total = totalUsers.rows[0].total || 1;
  const inactive = total - activeUsers.rows[0].total;
  const absenteeismRate = Number(((inactive / total) * 100).toFixed(1));

  res.json({
    employees: employees.rows[0].total,
    admins: admins.rows[0].total,
    activeUsers: activeUsers.rows[0].total,
    absenteeismRate,
    pendingAbsences: suspendUsers.rows[0].total,
    lateArrivalsCount: createUsers.rows[0].total,
    monthlyOvertimeHours: updateConfig.rows[0].total * 4,
    estimatedOvertimeCost: updateConfig.rows[0].total * 80,
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
          ORDER BY created_at DESC
        `
      )
    ).rows;
  } else {
    rows = (
      await query(
        `
          SELECT user_name, action, target, details, created_at
          FROM audit_logs
          ORDER BY created_at DESC
        `
      )
    ).rows;
  }

  const headers = Object.keys(rows[0] || { empty: "" });
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    doc.fontSize(16).text("DigitalAfrika - Rapport SuperAdmin");
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Type: ${type}`);
    doc.text(`Service: ${service}`);
    doc.text(`Periode: ${month || "toutes"}`);
    doc.text(`Nombre de lignes: ${rows.length}`);
    doc.moveDown();

    const printableRows = rows.slice(0, 120);
    for (const row of printableRows) {
      doc.fontSize(8).text(Object.entries(row).map(([k, v]) => `${k}: ${v ?? ""}`).join(" | "));
      doc.moveDown(0.3);
    }
    if (rows.length > printableRows.length) {
      doc.moveDown().fontSize(8).text(`... ${rows.length - printableRows.length} lignes supplementaires non affichees.`);
    }
    doc.end();
    return;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${type}_${month || "all"}.csv"`);
  res.send(csv);
});

async function seedIfNeeded() {
  const check = await query("SELECT id FROM employes WHERE role = 'superadmin' LIMIT 1");
  if (!check.rowCount) {
    const hash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || "password123", 10);
    await query(
      `
        INSERT INTO employes (first_name, last_name, email, password_hash, role, service, active, badge_uid)
        VALUES ('Super', 'Admin', $1, $2, 'superadmin', 'Direction', true, 'SUPER-RFID-001')
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
