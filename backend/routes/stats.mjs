import { Router } from "express";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ─── GET /api/stats/month ─── (Employé: mes stats mensuelles)
router.get("/month", async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const pointages = await query(
      `SELECT
         COUNT(*) FILTER (WHERE statut IN ('present','retard'))::int AS jours_travailles,
         COALESCE(SUM(duree_travail_minutes), 0)::int AS heures_totales_min,
         COUNT(*) FILTER (WHERE statut = 'retard')::int AS retards,
         COALESCE(SUM(heures_sup_minutes), 0)::int AS heures_sup_totales
       FROM pointages
       WHERE employe_id = $1 AND date >= $2 AND date <= $3`,
      [req.auth.sub, startOfMonth, endOfMonth]
    );

    const absences = await query(
      `SELECT
         COUNT(*) FILTER (WHERE t.code != 'ABSENCE_INJUST')::int AS absences_justifiees,
         COUNT(*) FILTER (WHERE t.code = 'ABSENCE_INJUST')::int AS absences_injustifiees
       FROM absences a
       JOIN types_absence t ON t.id = a.type_absence_id
       WHERE a.employe_id = $1 AND a.statut = 'approuvee'
         AND a.date_debut >= $2 AND a.date_fin <= $3`,
      [req.auth.sub, startOfMonth, endOfMonth]
    );

    // Solde congés: 25 jours/an - congés pris cette année
    const congesPris = await query(
      `SELECT COUNT(*)::int AS total
       FROM absences a
       JOIN types_absence t ON t.id = a.type_absence_id
       WHERE a.employe_id = $1 AND t.code = 'CONGE_PAYE' AND a.statut = 'approuvee'
         AND EXTRACT(YEAR FROM a.date_debut) = $2`,
      [req.auth.sub, now.getFullYear()]
    );

    const p = pointages.rows[0];
    const ab = absences.rows[0];

    res.json({
      joursTravailles: p.jours_travailles,
      heuresTotales: Math.floor(p.heures_totales_min / 60),
      retards: p.retards,
      soldeConges: 25 - (congesPris.rows[0]?.total || 0),
      heuresSupTotales: p.heures_sup_totales,
      absencesJustifiees: ab.absences_justifiees,
      absencesInjustifiees: ab.absences_injustifiees,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/global ─── (Admin: stats globales)
router.get("/global", requireAdmin, async (req, res, next) => {
  try {
    const { service } = req.query;
    const serviceFilter = req.auth.role === "admin" ? req.auth.serviceId : service;

    let empSql = "SELECT COUNT(*)::int AS total FROM employes WHERE role = 'employee' AND actif = true";
    let empParams = [];
    if (serviceFilter) {
      empParams.push(serviceFilter);
      empSql += ` AND service_id = $${empParams.length}`;
    }

    const totalResult = await query(empSql, empParams);
    const totalEmployes = totalResult.rows[0].total;

    // Retards aujourd'hui
    let retardSql = `SELECT COUNT(*)::int AS total
                     FROM pointages p
                     JOIN employes e ON e.id = p.employe_id
                     WHERE p.date = CURRENT_DATE AND p.statut = 'retard'`;
    const retardParams = [];
    if (serviceFilter) {
      retardParams.push(serviceFilter);
      retardSql += ` AND e.service_id = $${retardParams.length}`;
    }
    const retardsResult = await query(retardSql, retardParams);

    // Présences temps réel
    let presenceSql = `SELECT COUNT(*)::int AS total
                       FROM pointages p
                       JOIN employes e ON e.id = p.employe_id
                       WHERE p.date = CURRENT_DATE AND p.heure_arrivee IS NOT NULL`;
    const presenceParams = [];
    if (serviceFilter) {
      presenceParams.push(serviceFilter);
      presenceSql += ` AND e.service_id = $${presenceParams.length}`;
    }
    const presenceResult = await query(presenceSql, presenceParams);

    // Absences en attente
    let pendingSql = `SELECT COUNT(*)::int AS total
                      FROM absences a
                      JOIN employes e ON e.id = a.employe_id
                      WHERE a.statut = 'en_attente'`;
    const pendingParams = [];
    if (serviceFilter) {
      pendingParams.push(serviceFilter);
      pendingSql += ` AND e.service_id = $${pendingParams.length}`;
    }
    const pendingResult = await query(pendingSql, pendingParams);

    const presentsCount = presenceResult.rows[0].total;
    const tauxPresence = totalEmployes > 0 ? Math.round((presentsCount / totalEmployes) * 100) : 0;

    res.json({
      tauxAbsenteisme: totalEmployes > 0 ? parseFloat((100 - tauxPresence).toFixed(1)) : 0,
      retardsAujourdhui: retardsResult.rows[0].total,
      presenceTempsReel: tauxPresence,
      notificationsPending: pendingResult.rows[0].total,
      totalEmployes,
      employesActifs: presentsCount,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/stats/weekly-pointages ─── (Admin: stats pour le graphique)
router.get("/weekly-pointages", requireAdmin, async (req, res, next) => {
  console.log("📊 Requête stats hebdo reçue pour service:", req.query.service || "Tous");
  try {
    const { service } = req.query;
    const serviceFilter = req.auth.role === "admin" ? req.auth.serviceId : service;

    let sql = `
      SELECT 
        EXTRACT(ISODOW FROM date) AS day_of_week,
        COUNT(*) FILTER (WHERE statut = 'present')::int AS presences,
        COUNT(*) FILTER (WHERE statut = 'retard')::int AS retards
      FROM pointages p
      JOIN employes e ON e.id = p.employe_id
      WHERE date >= CURRENT_DATE - CAST(EXTRACT(ISODOW FROM CURRENT_DATE) - 1 AS int) 
      AND date <= CURRENT_DATE + CAST(7 - EXTRACT(ISODOW FROM CURRENT_DATE) AS int)
      AND EXTRACT(ISODOW FROM date) <= 5
    `;
    let params = [];
    if (serviceFilter) {
      params.push(serviceFilter);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += ` GROUP BY day_of_week ORDER BY day_of_week`;

    const result = await query(sql, params);
    
    // Format response: Array of 5 days (1 to 5)
    const weeklyData = [1,2,3,4,5].map(day => {
      const row = result.rows.find(r => parseInt(r.day_of_week) === day);
      return {
        day,
        presences: row ? parseInt(row.presences) : 0,
        retards: row ? parseInt(row.retards) : 0
      };
    });

    res.json(weeklyData);
  } catch (err) {
    next(err);
  }
});

export default router;
