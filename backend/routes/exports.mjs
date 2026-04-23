import { Router } from "express";
import ExcelJS from "exceljs";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";

const router = Router();

// ─── GET /api/exports/pointages ───
router.get("/pointages", requireAdmin, async (req, res, next) => {
  try {
    const { month } = req.query;
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

    if (req.auth.role === "admin") {
      params.push(req.auth.serviceId);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " ORDER BY p.date, e.last_name";

    const result = await query(sql, params);

    const headers = ["Matricule", "Nom", "Poste", "Service", "Date", "Arrivée", "Départ", "Statut", "Retard (min)", "H.Sup (min)", "Durée (min)"];
    const format = String(req.query.format || "csv").toLowerCase();

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Pointages");
      worksheet.columns = headers.map(h => ({ header: h, key: h, width: 15 }));
      
      const excelRows = result.rows.map(r => ({
        "Matricule": r.matricule, "Nom": r.nom, "Poste": r.poste, "Service": r.service,
        "Date": r.date, "Arrivée": r.heure_arrivee || "", "Départ": r.heure_depart || "",
        "Statut": r.statut, "Retard (min)": r.retard_minutes, "H.Sup (min)": r.heures_sup_minutes, "Durée (min)": r.duree_travail_minutes
      }));
      worksheet.addRows(excelRows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="pointages_${month || "all"}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // CSV
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pointages_${month || "all"}.csv"`);
    res.write(headers.join(",") + "\n");

    for (const r of result.rows) {
      const line = [
        r.matricule, `"${r.nom}"`, `"${r.poste}"`, `"${r.service}"`,
        r.date, r.heure_arrivee || "", r.heure_depart || "",
        r.statut, r.retard_minutes, r.heures_sup_minutes, r.duree_travail_minutes,
      ].join(",");
      res.write(line + "\n");
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/exports/absences ───
router.get("/absences", requireAdmin, async (req, res, next) => {
  try {
    const { month } = req.query;
    let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                      t.libelle AS type_absence,
                      a.date_debut, a.date_fin, a.motif, a.statut, a.motif_rejet
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
    if (req.auth.role === "admin") {
      params.push(req.auth.serviceId);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " ORDER BY a.date_debut DESC";

    const result = await query(sql, params);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="absences_${month || "all"}.csv"`);

    res.write("Matricule,Nom,Type,Début,Fin,Motif,Statut,Motif Rejet\n");
    for (const r of result.rows) {
      const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      res.write([r.matricule, esc(r.nom), esc(r.type_absence), r.date_debut, r.date_fin, esc(r.motif), r.statut, esc(r.motif_rejet)].join(",") + "\n");
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/exports/paie ───
router.get("/paie", requireAdmin, async (req, res, next) => {
  try {
    const { month } = req.query;
    const startDate = month ? `${month}-01` : new Date().toISOString().slice(0, 8) + "01";
    const endDate = month
      ? new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0]
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

    let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                      e.poste, s.nom AS service, e.type_contrat,
                      COUNT(*) FILTER (WHERE p.statut IN ('present','retard'))::int AS jours_travailles,
                      COALESCE(SUM(p.duree_travail_minutes), 0)::int AS total_minutes,
                      COUNT(*) FILTER (WHERE p.statut = 'retard')::int AS nb_retards,
                      COALESCE(SUM(p.retard_minutes), 0)::int AS total_retard_min,
                      COALESCE(SUM(p.heures_sup_minutes), 0)::int AS total_heures_sup_min
               FROM employes e
               JOIN services s ON s.id = e.service_id
               LEFT JOIN pointages p ON p.employe_id = e.id AND p.date >= $1 AND p.date <= $2
               WHERE e.role = 'employee' AND e.actif = true`;
    const params = [startDate, endDate];

    if (req.auth.role === "admin") {
      params.push(req.auth.serviceId);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " GROUP BY e.id, s.nom ORDER BY e.last_name";

    const result = await query(sql, params);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="paie_${month || "all"}.csv"`);

    res.write("Matricule,Nom,Poste,Service,Contrat,Jours Travaillés,Heures Totales,Retards,Minutes Retard,Heures Sup\n");
    for (const r of result.rows) {
      const totalH = Math.floor(r.total_minutes / 60);
      const hSupH = Math.floor(r.total_heures_sup_min / 60);
      res.write([r.matricule, `"${r.nom}"`, `"${r.poste}"`, `"${r.service}"`, r.type_contrat, r.jours_travailles, totalH, r.nb_retards, r.total_retard_min, hSupH].join(",") + "\n");
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/exports/disciplinaire ───
router.get("/disciplinaire", requireAdmin, async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    let sql = `SELECT e.matricule, e.first_name || ' ' || e.last_name AS nom,
                      s.type_sanction, s.motif, s.nb_retards, s.nb_absences_injust,
                      s.statut, s.commentaire_admin, s.mois_reference, s.created_at
               FROM sanctions s
               JOIN employes e ON e.id = s.employe_id
               WHERE 1=1`;
    const params = [];
    if (employeeId) { params.push(employeeId); sql += ` AND s.employe_id = $${params.length}`; }
    sql += " ORDER BY s.created_at DESC";

    const result = await query(sql, params);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="disciplinaire.csv"');

    res.write("Matricule,Nom,Type,Motif,Retards,Absences Injust.,Statut,Commentaire,Mois,Date\n");
    for (const r of result.rows) {
      const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      res.write([r.matricule, esc(r.nom), r.type_sanction, esc(r.motif), r.nb_retards, r.nb_absences_injust, r.statut, esc(r.commentaire_admin), r.mois_reference, r.created_at].join(",") + "\n");
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/types-absence ───
router.get("/types-absence", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM types_absence WHERE actif = true ORDER BY libelle");
    res.json(result.rows.map((t) => ({
      id: t.id, code: t.code, libelle: t.libelle, justificatifRequis: t.justificatif_requis,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
