import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin, requireCanPoint } from "../middleware/auth.mjs";
import { randomUUID } from "crypto";

const router = Router();

async function assertAdminScopeByEmployee(req, employeeId) {
  // All admins can view all employees' pointages
  return true;
}

// ════════════════════════════════════════════
// EMPLOYÉ — Mes pointages
// ════════════════════════════════════════════

// ─── GET /api/pointages/today ───
router.get("/today", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, date, heure_arrivee, heure_depart, statut, retard_minutes,
              heures_sup_minutes, duree_travail_minutes
       FROM pointages
       WHERE employe_id = $1 AND date = CURRENT_DATE`,
      [req.auth.sub]
    );
    if (!result.rowCount) {
      return res.json({
        id: null, date: new Date().toISOString().split("T")[0],
        checkIn: null, checkOut: null,
        status: "non_pointe", delayMinutes: 0,
        heuresSupMinutes: 0, dureeTravailMinutes: 0,
      });
    }
    const p = result.rows[0];
    res.json({
      id: p.id,
      date: p.date,
      checkIn: p.heure_arrivee ? p.heure_arrivee.toISOString().slice(11, 16) : null,
      checkOut: p.heure_depart ? p.heure_depart.toISOString().slice(11, 16) : null,
      status: p.statut,
      delayMinutes: p.retard_minutes,
      heuresSupMinutes: p.heures_sup_minutes,
      dureeTravailMinutes: p.duree_travail_minutes,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pointages/history ───
router.get("/history", async (req, res, next) => {
  try {
    const { start, end } = req.query;
    let sql = `SELECT id, date, heure_arrivee, heure_depart, statut, retard_minutes,
                      heures_sup_minutes, duree_travail_minutes
               FROM pointages WHERE employe_id = $1`;
    const params = [req.auth.sub];

    if (start) { params.push(start); sql += ` AND date >= $${params.length}`; }
    if (end) { params.push(end); sql += ` AND date <= $${params.length}`; }
    sql += " ORDER BY date DESC";

    const result = await query(sql, params);
    res.json(result.rows.map(formatPointage));
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════
// ADMIN — Tous les pointages
// ════════════════════════════════════════════

// ─── GET /api/pointages/all ───
router.get("/all", requireAdmin, async (req, res, next) => {
  try {
    const { service, start, end } = req.query;
    let sql = `SELECT p.*, e.first_name, e.last_name, e.service_id
               FROM pointages p
               JOIN employes e ON e.id = p.employe_id
               WHERE 1=1`;
    const params = [];

    // All admins see all pointages (no service restriction)
    if (service) {
      params.push(service);
      sql += ` AND e.service_id = $${params.length}`;
    }
    if (start) { params.push(start); sql += ` AND p.date >= $${params.length}`; }
    if (end) { params.push(end); sql += ` AND p.date <= $${params.length}`; }
    sql += " ORDER BY p.date DESC, e.last_name";

    const result = await query(sql, params);
    res.json(result.rows.map((p) => ({
      ...formatPointage(p),
      employeeId: p.employe_id,
      employeeName: `${p.first_name} ${p.last_name}`,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pointages/live ───
router.get("/live", requireAdmin, async (req, res, next) => {
  try {
    let sql = `SELECT e.id AS employe_id, e.first_name, e.last_name, e.poste, e.service_id,
                      p.heure_arrivee, p.heure_depart, p.statut, p.retard_minutes
               FROM employes e
               LEFT JOIN pointages p ON p.employe_id = e.id AND p.date = CURRENT_DATE
               WHERE e.actif = true AND e.role = 'employee'`;
    const params = [];

    // All admins see all employees' live pointages
    sql += " ORDER BY e.last_name";

    const result = await query(sql, params);
    res.json(result.rows.map((r) => ({
      employeeId: r.employe_id,
      employeeName: `${r.first_name} ${r.last_name}`,
      poste: r.poste,
      checkIn: r.heure_arrivee ? r.heure_arrivee.toISOString().slice(11, 16) : null,
      checkOut: r.heure_depart ? r.heure_depart.toISOString().slice(11, 16) : null,
      status: r.statut || "non_pointe",
      delayMinutes: r.retard_minutes || 0,
    })));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pointages/employee/:id ───
router.get("/employee/:id", requireAdmin, async (req, res, next) => {
  try {
    const inScope = await assertAdminScopeByEmployee(req, req.params.id);
    if (!inScope) {
      return res.status(403).json({ message: "Accès interdit hors périmètre." });
    }
    const { start, end } = req.query;
    let sql = `SELECT id, date, heure_arrivee, heure_depart, statut, retard_minutes,
                      heures_sup_minutes, duree_travail_minutes
               FROM pointages WHERE employe_id = $1`;
    const params = [req.params.id];

    if (start) { params.push(start); sql += ` AND date >= $${params.length}`; }
    if (end) { params.push(end); sql += ` AND date <= $${params.length}`; }
    sql += " ORDER BY date DESC";

    const result = await query(sql, params);
    res.json(result.rows.map(formatPointage));
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════
// QR CODE — Pointage
// ════════════════════════════════════════════

// ─── GET /api/pointages/qr/daily ─── (Admin: obtenir le QR du jour — nécessite canPoint)
router.get("/qr/daily", requireAdmin, requireCanPoint, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Chercher un token actif pour aujourd'hui
    let result = await query(
      "SELECT * FROM qr_tokens WHERE date = $1 AND actif = true ORDER BY created_at DESC LIMIT 1",
      [today]
    );

    if (result.rowCount) {
      const qr = result.rows[0];
      return res.json({
        id: qr.id, date: qr.date, token: qr.token,
        expiresAt: qr.expires_at, generePar: "Admin",
        createdAt: qr.created_at,
      });
    }

    // Sinon en créer un nouveau
    const token = `QR-${today}-${randomUUID()}`;
    const expiresAt = `${today}T23:59:59`;
    const insert = await query(
      `INSERT INTO qr_tokens (token, date, expires_at, genere_par)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [token, today, expiresAt, req.auth.sub]
    );
    const qr = insert.rows[0];
    res.json({
      id: qr.id, date: qr.date, token: qr.token,
      expiresAt: qr.expires_at, generePar: "Admin",
      createdAt: qr.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/pointages/qr/regenerate ─── (Admin: régénérer le QR — nécessite canPoint)
router.post("/qr/regenerate", requireAdmin, requireCanPoint, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Désactiver les anciens tokens du jour
    await query("UPDATE qr_tokens SET actif = false WHERE date = $1", [today]);

    const token = `QR-${today}-${randomUUID()}`;
    const expiresAt = `${today}T23:59:59`;
    const insert = await query(
      `INSERT INTO qr_tokens (token, date, expires_at, genere_par)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [token, today, expiresAt, req.auth.sub]
    );
    const qr = insert.rows[0];
    res.json({
      id: qr.id, date: qr.date, token: qr.token,
      expiresAt: qr.expires_at, generePar: "Admin",
      createdAt: qr.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/pointages/qr/validate ─── (Employé: scanner le QR)
router.post("/qr/validate", async (req, res, next) => {
  try {
    const { qrData } = req.body || {};
    if (!qrData) {
      return res.status(400).json({ message: "Données QR manquantes." });
    }

    // Si l'utilisateur est un admin, vérifier la permission canPoint
    if (req.auth.role === "admin") {
      const permResult = await query("SELECT admin_permissions FROM employes WHERE id = $1", [req.auth.sub]);
      const rawPerms = permResult.rows[0]?.admin_permissions;
      const perms = rawPerms && typeof rawPerms === 'object' && Object.keys(rawPerms).length > 0
        ? rawPerms
        : { canPoint: true };
      if (perms.canPoint === false) {
        return res.status(403).json({ message: "Vous n'avez pas la permission de pointer." });
      }
    }

    // Parser le payload QR
    let token = qrData;
    try {
      const parsed = JSON.parse(qrData);
      if (parsed && parsed.token && parsed.type === "pointage") {
        token = parsed.token;
      }
    } catch {
      // Ignorer l'erreur si ce n'est pas du JSON, on suppose que string = le token
    }

    if (!token || token.length < 5) {
      return res.status(400).json({ message: "QR Code invalide." });
    }

    const today = new Date().toISOString().split("T")[0];

    const tokenResult = await query(
      "SELECT * FROM qr_tokens WHERE token = $1 AND date = $2 AND actif = true",
      [token, today]
    );
    if (!tokenResult.rowCount) {
      return res.status(400).json({ message: "QR Code expiré ou invalide." });
    }

    // Charger l'employé pour calculer le retard
    const empResult = await query(
      "SELECT heure_debut, heure_fin FROM employes WHERE id = $1",
      [req.auth.sub]
    );
    if (!empResult.rowCount) {
      return res.status(404).json({ message: "Employé introuvable." });
    }
    const emp = empResult.rows[0];
    const now = new Date();
    const heureDebut = emp.heure_debut;
    const heureFin = emp.heure_fin;

    // Vérifier si un pointage existe déjà
    const existingResult = await query(
      "SELECT * FROM pointages WHERE employe_id = $1 AND date = $2",
      [req.auth.sub, today]
    );

    if (!existingResult.rowCount) {
      // Premier scan → Arrivée
      const retardMinutes = Math.max(
        0,
        Math.floor((now.getHours() * 60 + now.getMinutes()) -
          (parseInt(heureDebut.slice(0, 2)) * 60 + parseInt(heureDebut.slice(3, 5))))
      );
      const statut = retardMinutes > 0 ? "retard" : "present";
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");

      await query(
        `INSERT INTO pointages (employe_id, date, heure_arrivee, statut, retard_minutes, source)
         VALUES ($1, $2, $3, $4, $5, 'qr')`,
        [req.auth.sub, today, now, statut, retardMinutes]
      );

      // Notification si retard
      if (retardMinutes > 0) {
        await query(
          `INSERT INTO notifications (employe_id, type, titre, message)
           VALUES ($1, 'retard', 'Retard détecté', $2)`,
          [req.auth.sub, `Retard de ${retardMinutes} minutes enregistré ce matin.`]
        );
      }

      return res.json({
        message: "Pointage enregistré avec succès",
        type: "arrivee",
        heure: `${hh}:${mm}`,
        date: today,
        status: statut,
        delayMinutes: retardMinutes,
        source: "qr",
      });
    } else {
      // Deuxième scan → Départ
      const existing = existingResult.rows[0];
      if (existing.heure_depart) {
        return res.status(400).json({ message: "Arrivée et départ déjà enregistrés aujourd'hui." });
      }

      const heureFinMinutes = parseInt(heureFin.slice(0, 2)) * 60 + parseInt(heureFin.slice(3, 5));
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const heuresSupMinutes = Math.max(0, nowMinutes - heureFinMinutes);

      const arriveeMs = existing.heure_arrivee.getTime();
      const dureeMinutes = Math.floor((now.getTime() - arriveeMs) / 60000);

      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");

      await query(
        `UPDATE pointages
         SET heure_depart = $1, heures_sup_minutes = $2, duree_travail_minutes = $3
         WHERE id = $4`,
        [now, heuresSupMinutes, dureeMinutes, existing.id]
      );

      return res.json({
        message: "Départ enregistré avec succès",
        type: "depart",
        heure: `${hh}:${mm}`,
        date: today,
        heuresSupMinutes,
        dureeTravailMinutes: dureeMinutes,
        source: "qr",
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── Helper ───
function formatPointage(p) {
  return {
    id: p.id,
    date: p.date,
    checkIn: p.heure_arrivee
      ? (p.heure_arrivee instanceof Date ? p.heure_arrivee.toISOString().slice(11, 16) : String(p.heure_arrivee).slice(0, 5))
      : null,
    checkOut: p.heure_depart
      ? (p.heure_depart instanceof Date ? p.heure_depart.toISOString().slice(11, 16) : String(p.heure_depart).slice(0, 5))
      : null,
    status: p.statut,
    delayMinutes: p.retard_minutes,
    heuresSupMinutes: p.heures_sup_minutes,
    dureeTravailMinutes: p.duree_travail_minutes,
  };
}

export default router;
