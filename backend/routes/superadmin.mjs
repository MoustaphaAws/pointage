import { Router } from "express";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { query } from "../db.mjs";
import { requireSuperAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";

const router = Router();

// Toutes les routes sont protégées par requireSuperAdmin
router.use(requireSuperAdmin);

// ═══════════════════════════════════════════════
// GESTION DES UTILISATEURS (Admin + Employé)
// ═══════════════════════════════════════════════

// ─── GET /api/admin/admins ───
router.get("/admins", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.role,
              s.nom AS service, e.poste, e.actif AS active,
              e.uid_badge AS badge_uid, e.created_at
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
    const { firstName, lastName, email, role, service, poste, badgeUid, password } = req.body || {};
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
    const hash = await bcrypt.hash(password, 10);

    // Générer le matricule
    const matResult = await query("SELECT generate_matricule() AS mat");
    const matricule = matResult.rows[0].mat;

    const insert = await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, role, service_id, poste, uid_badge, actif, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       RETURNING id, first_name, last_name, email, role, poste, actif, uid_badge, created_at`,
      [matricule, firstName, lastName, String(email).toLowerCase(), hash, safeRole, serviceId, poste || null, badgeUid || null, req.auth.sub]
    );
    const created = insert.rows[0];

    // Notification de bienvenue
    const defaultPwd = password;
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'bienvenue', 'Bienvenue !', $2)`,
      [created.id, `Bienvenue chez DigitalAfrika. Identifiant : ${email} / Mot de passe temporaire : ${defaultPwd}`]
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
    const { firstName, lastName, service, poste, role, badgeUid } = req.body || {};
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
         uid_badge = COALESCE($6, uid_badge)
       WHERE id = $7 AND role IN ('admin', 'employee')
       RETURNING *`,
      [firstName || null, lastName || null, serviceId, poste || null, safeRole, badgeUid || null, req.params.id]
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
    // Mapper les clés françaises vers les clés anglaises attendues par le frontend
    res.json({
      lateThreshold: config.seuil_rappel_retards ?? 3,
      absenceThreshold: config.seuil_avertissement ?? 5,
      defaultEntry: config.heure_debut_defaut ?? "08:00",
      defaultExit: config.heure_fin_defaut ?? "17:00",
      requireJustification: config.require_justification !== undefined ? String(config.require_justification) === "true" : true,
      notifyOnAbsence3Days: config.notify_absence_3d !== undefined ? String(config.notify_absence_3d) === "true" : true,
      notifySuspiciousRhValidation: config.notify_suspicious_rh !== undefined ? String(config.notify_suspicious_rh) === "true" : true,
      // Conserver les clés originales aussi
      ...config,
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
      absenceThreshold: "seuil_avertissement",
      defaultEntry: "heure_debut_defaut",
      defaultExit: "heure_fin_defaut",
      requireJustification: "require_justification",
      notifyOnAbsence3Days: "notify_absence_3d",
      notifySuspiciousRhValidation: "notify_suspicious_rh",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbKey = keyMap[key] || key;
      const dbValue = typeof value === "string" ? value : String(value);
      await query(
        `UPDATE configurations SET valeur = $1, modifie_par = $2, updated_at = NOW() WHERE cle = $3`,
        [dbValue, req.auth.sub, dbKey]
      );
    }

    if (actor) {
      await writeAuditLog({
        userId: actor.id, userName: actor.name, role: actor.role,
        action: "UPDATE_CONFIG", target: "CONFIG_GLOBAL",
        details: "Mise à jour des paramètres système", ip: req.ip,
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

    const lateToday = await query(
      `SELECT COUNT(*)::int AS total FROM pointages p
       JOIN employes e ON e.id = p.employe_id
       WHERE p.date = CURRENT_DATE AND p.statut = 'retard'`
    );

    const pendingAbsences = await query(
      `SELECT COUNT(*)::int AS total FROM absences WHERE statut = 'en_attente'`
    );

    const overtime = await query(
      `SELECT COALESCE(SUM(heures_sup_minutes), 0)::int AS total
       FROM pointages WHERE date >= $1 AND date <= $2`,
      [startOfMonth, endOfMonth]
    );

    const total = totalUsers.rows[0].total || 1;
    const presentToday = await query(
      `SELECT COUNT(*)::int AS total FROM pointages p
       JOIN employes e ON e.id = p.employe_id
       WHERE p.date = CURRENT_DATE AND p.heure_arrivee IS NOT NULL`
    );
    const absenteeismRate = Number(((1 - presentToday.rows[0].total / total) * 100).toFixed(1));

    res.json({
      employees: employees.rows[0].total,
      admins: admins.rows[0].total,
      activeUsers: activeUsers.rows[0].total,
      absenteeismRate: Math.max(0, absenteeismRate),
      pendingAbsences: pendingAbsences.rows[0].total,
      lateArrivalsCount: lateToday.rows[0].total,
      monthlyOvertimeHours: Math.floor(overtime.rows[0].total / 60),
      estimatedOvertimeCost: Math.floor(overtime.rows[0].total / 60) * 4000,
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
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);
      doc.fontSize(16).text("DigitalAfrika — Rapport SuperAdmin");
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Type: ${type}`);
      doc.text(`Service: ${service}`);
      doc.text(`Période: ${month || "toutes"}`);
      doc.text(`Nombre de lignes: ${rows.length}`);
      doc.moveDown();

      const printableRows = rows.slice(0, 120);
      for (const row of printableRows) {
        doc.fontSize(8).text(Object.entries(row).map(([k, v]) => `${k}: ${v ?? ""}`).join(" | "));
        doc.moveDown(0.3);
      }
      if (rows.length > printableRows.length) {
        doc.moveDown().fontSize(8).text(`... ${rows.length - printableRows.length} lignes supplémentaires non affichées.`);
      }
      doc.end();
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
