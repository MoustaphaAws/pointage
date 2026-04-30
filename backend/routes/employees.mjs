import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";
import { writeAuditLog, getActor } from "../utils/audit.mjs";

const router = Router();

async function assertAdminScope(req, employeeId) {
  // All admins and superadmins can view/manage all employees
  return true;
}

async function logDenied(req, target, details) {
  const actor = await getActor(req);
  if (!actor) return;
  await writeAuditLog({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "ACCESS_DENIED",
    target,
    details,
    ip: req.ip,
  });
}

// ─── GET /api/employees ─── (Admin: liste tous les employés, SuperAdmin: employés + admins)
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { service, status, search, contrat } = req.query;
    let sql = `SELECT e.*, s.nom AS service_name
               FROM employes e
               JOIN services s ON s.id = e.service_id
               WHERE 1=1`;
    const params = [];

    // Admins voient tous les employés (role='employee') de tous les services
    // Superadmins voient les employés + les admins
    if (req.auth.role === "admin") {
      sql += ` AND e.role = 'employee'`;
    } else if (req.auth.role === "superadmin") {
      sql += ` AND e.role IN ('employee', 'admin')`;
    }

    if (service) { params.push(service); sql += ` AND e.service_id = $${params.length}`; }
    if (status) {
      const isActive = status === "actif";
      sql += ` AND e.actif = ${isActive}`;
    }
    if (contrat) { params.push(contrat); sql += ` AND e.type_contrat = $${params.length}`; }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const idx = params.length;
      sql += ` AND (LOWER(e.first_name || ' ' || e.last_name) LIKE $${idx} OR LOWER(e.email) LIKE $${idx} OR LOWER(e.matricule) LIKE $${idx})`;
    }
    sql += " ORDER BY e.last_name, e.first_name";

    const result = await query(sql, params);
    res.json(result.rows.map(formatEmployee));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/employees/:id ─── (Admin: profil complet)
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScope(req, req.params.id);
    if (!inScope) {
      await logDenied(req, "EMPLOYEE", `Consultation hors périmètre: ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      `SELECT e.*, s.nom AS service_name
       FROM employes e
       JOIN services s ON s.id = e.service_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Employé introuvable." });
    }
    res.json(formatEmployee(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/employees ─── (Admin: créer)
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, serviceId, poste, typeContrat, dateEmbauche, dateFinContrat, heureDebut, heureFin, uidBadge } = req.body || {};
    if (req.auth.role === "admin" && serviceId !== req.auth.serviceId) {
      await logDenied(req, "EMPLOYEE", `Création hors périmètre demandé (${serviceId})`);
      return res.status(403).json({ message: "Accès interdit : création hors périmètre." });
    }
    if (!firstName || !lastName || !email || !serviceId || !poste) {
      return res.status(400).json({ message: "Champs obligatoires manquants (firstName, lastName, email, serviceId, poste)." });
    }

    // Générer le matricule automatiquement
    const matResult = await query("SELECT generate_matricule() AS mat");
    const matricule = matResult.rows[0].mat;

    // Mot de passe par défaut (devra être changé au premier login)
    const defaultPassword = `DA-${lastName.toLowerCase().slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = await bcrypt.hash(defaultPassword, 10);

    const result = await query(
      `INSERT INTO employes (matricule, first_name, last_name, email, password_hash, phone, service_id, poste,
                             type_contrat, date_embauche, date_fin_contrat, heure_debut, heure_fin, uid_badge, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        matricule, firstName, lastName, String(email).toLowerCase(), hash,
        phone || null, serviceId, poste,
        typeContrat || "CDI", dateEmbauche || new Date().toISOString().split("T")[0],
        dateFinContrat || null, heureDebut || "08:00", heureFin || "17:00",
        uidBadge || null, req.auth.sub,
      ]
    );

    const emp = result.rows[0];
    const actor = await getActor(req);

    // Notification de bienvenue
    await query(
      `INSERT INTO notifications (employe_id, type, titre, message)
       VALUES ($1, 'bienvenue', 'Bienvenue !', $2)`,
      [emp.id, `Bienvenue chez DigitalAfrika. Votre identifiant de connexion est : ${email}`]
    );

    // Enrichir avec le service name
    const srvResult = await query("SELECT nom FROM services WHERE id = $1", [serviceId]);

    res.status(201).json({
      ...formatEmployee({ ...emp, service_name: srvResult.rows[0]?.nom }),
      temporaryPassword: defaultPassword,
    });
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "CREATE_EMPLOYEE",
        target: `${emp.first_name} ${emp.last_name}`,
        details: `Création employé ${emp.id}`,
        ip: req.ip,
      });
    }
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Un employé avec cet email ou ce badge existe déjà." });
    }
    next(err);
  }
});

// ─── PUT /api/employees/:id ─── (Admin: modifier)
router.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScope(req, req.params.id);
    if (!inScope) {
      await logDenied(req, "EMPLOYEE", `Modification hors périmètre: ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }

    const { firstName, lastName, phone, serviceId, poste, typeContrat, heureDebut, heureFin, dateFinContrat } = req.body || {};
    if (req.auth.role === "admin" && serviceId && serviceId !== req.auth.serviceId) {
      await logDenied(req, "EMPLOYEE", `Transfert hors périmètre: ${req.params.id} -> ${serviceId}`);
      return res.status(403).json({ message: "Accès interdit : transfert hors périmètre." });
    }
    const result = await query(
      `UPDATE employes SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         phone = COALESCE($3, phone),
         service_id = COALESCE($4, service_id),
         poste = COALESCE($5, poste),
         type_contrat = COALESCE($6, type_contrat),
         heure_debut = COALESCE($7, heure_debut),
         heure_fin = COALESCE($8, heure_fin),
         date_fin_contrat = $9
       WHERE id = $10
       RETURNING *`,
      [
        firstName || null, lastName || null, phone || null,
        serviceId || null, poste || null, typeContrat || null,
        heureDebut || null, heureFin || null,
        dateFinContrat !== undefined ? dateFinContrat : null,
        req.params.id,
      ]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Employé introuvable." });
    }
    const srvResult = await query("SELECT nom FROM services WHERE id = $1", [result.rows[0].service_id]);
    res.json(formatEmployee({ ...result.rows[0], service_name: srvResult.rows[0]?.nom }));
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "UPDATE_EMPLOYEE",
        target: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
        details: `Mise à jour employé ${result.rows[0].id}`,
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/employees/:id/deactivate ───
router.put("/:id/deactivate", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScope(req, req.params.id);
    if (!inScope) {
      await logDenied(req, "EMPLOYEE", `Désactivation hors périmètre: ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      "UPDATE employes SET actif = false, badge_actif = false WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé introuvable." });
    res.json({ message: "Employé désactivé." });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "DEACTIVATE_EMPLOYEE",
        target: req.params.id,
        details: "Désactivation employé",
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/employees/:id/activate ───
router.put("/:id/activate", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScope(req, req.params.id);
    if (!inScope) {
      await logDenied(req, "EMPLOYEE", `Réactivation hors périmètre: ${req.params.id}`);
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const result = await query(
      "UPDATE employes SET actif = true, badge_actif = true WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Employé introuvable." });
    res.json({ message: "Employé réactivé." });
    const actor = await getActor(req);
    if (actor) {
      await writeAuditLog({
        userId: actor.id,
        userName: actor.name,
        role: actor.role,
        action: "ACTIVATE_EMPLOYEE",
        target: req.params.id,
        details: "Réactivation employé",
        ip: req.ip,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── Helper ───
function formatEmployee(e) {
  return {
    id: e.id,
    matricule: e.matricule,
    firstName: e.first_name,
    lastName: e.last_name,
    email: e.email,
    phone: e.phone,
    address: e.address,
    photoUrl: e.photo_url,
    role: e.role,
    serviceId: e.service_id,
    serviceName: e.service_name || null,
    poste: e.poste,
    typeContrat: e.type_contrat,
    actif: e.actif,
    firstLogin: e.first_login,
    uidBadge: e.uid_badge,
    badgeActif: e.badge_actif,
    heureDebut: e.heure_debut?.slice?.(0, 5) || e.heure_debut,
    heureFin: e.heure_fin?.slice?.(0, 5) || e.heure_fin,
    dateEmbauche: e.date_embauche,
    dateFinContrat: e.date_fin_contrat,
    createdAt: e.created_at,
  };
}

export default router;
