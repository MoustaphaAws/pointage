import { Router } from "express";
import PDFDocument from "pdfkit";
import { query } from "../db.mjs";
import { requireAdmin } from "../middleware/auth.mjs";
import { generateReportPDF } from "../utils/pdfHelper.mjs";

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

    // Optional service filter (no longer restricted by admin scope)
    if (req.query.service) {
      params.push(req.query.service);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " ORDER BY p.date, e.last_name";

    const result = await query(sql, params);

    const headers = ["Matricule", "Nom", "Poste", "Service", "Date", "Arrivée", "Départ", "Statut", "Retard (min)", "H.Sup (min)", "Durée (min)"];
    const format = String(req.query.format || "csv").toLowerCase();

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="pointages_${month || "all"}.pdf"`);
      
      const columns = [
        { header: "Matricule", key: "matricule", width: 1.2 },
        { header: "Nom", key: "nom", width: 2.5 },
        { header: "Service", key: "service", width: 1.5 },
        { header: "Date", key: "date", width: 1.2 },
        { header: "Arrivée", key: "heure_arrivee", width: 1 },
        { header: "Départ", key: "heure_depart", width: 1 },
        { header: "Statut", key: "statut", width: 1 },
        { header: "H.Sup", key: "heures_sup_minutes", width: 0.8 }
      ];

      await generateReportPDF(res, {
        title: "Rapport Mensuel des Pointages",
        columns,
        rows: result.rows,
        metadata: {
          period: month || "Toutes",
          service: req.query.service || "Tous les Services"
        }
      });
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
    // Optional service filter (no longer restricted by admin scope)
    if (req.query.service) {
      params.push(req.query.service);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " ORDER BY a.date_debut DESC";

    const result = await query(sql, params);

    const format = String(req.query.format || "csv").toLowerCase();
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="absences_${month || "all"}.pdf"`);

      const columns = [
        { header: "Matricule", key: "matricule", width: 1.2 },
        { header: "Nom", key: "nom", width: 2.5 },
        { header: "Type", key: "type_absence", width: 1.5 },
        { header: "Début", key: "date_debut", width: 1.2 },
        { header: "Fin", key: "date_fin", width: 1.2 },
        { header: "Statut", key: "statut", width: 1.2 }
      ];

      await generateReportPDF(res, {
        title: "Rapport Historique des Absences",
        columns,
        rows: result.rows,
        metadata: {
          period: month || "Toutes",
          service: req.query.service || "Tous les Services"
        }
      });
      return;
    }

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

    // Optional service filter (no longer restricted by admin scope)
    if (req.query.service) {
      params.push(req.query.service);
      sql += ` AND e.service_id = $${params.length}`;
    }
    sql += " GROUP BY e.id, s.nom ORDER BY e.last_name";

    const result = await query(sql, params);

    const format = String(req.query.format || "csv").toLowerCase();
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="paie_${month || "all"}.pdf"`);

      const columns = [
        { header: "Matricule", key: "matricule", width: 1.2 },
        { header: "Nom", key: "nom", width: 2.5 },
        { header: "Poste", key: "poste", width: 1.5 },
        { header: "Service", key: "service", width: 1.5 },
        { header: "J. Trav", key: "jours_travailles", width: 0.8 },
        { header: "H. Tot", key: "total_minutes", width: 0.8 },
        { header: "Retards", key: "nb_retards", width: 0.8 },
        { header: "H. Sup", key: "total_heures_sup_min", width: 0.8 }
      ];

      // Conversion minutes -> heures pour le PDF
      const rows = result.rows.map(r => ({
        ...r,
        total_minutes: (r.total_minutes / 60).toFixed(1),
        total_heures_sup_min: (r.total_heures_sup_min / 60).toFixed(1)
      }));

      await generateReportPDF(res, {
        title: "Synthèse de Paie Mensuelle",
        columns,
        rows,
        metadata: {
          period: month || "Toutes",
          service: req.query.service || "Tous les Services"
        }
      });
      return;
    }

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

    const format = String(req.query.format || "csv").toLowerCase();
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="disciplinaire.pdf"');

      const columns = [
        { header: "Matricule", key: "matricule", width: 1.2 },
        { header: "Nom", key: "nom", width: 2.5 },
        { header: "Type Sanction", key: "type_sanction", width: 1.5 },
        { header: "Motif", key: "motif", width: 2.5 },
        { header: "Statut", key: "statut", width: 1.2 },
        { header: "Mois", key: "mois_reference", width: 1 }
      ];

      await generateReportPDF(res, {
        title: "Audit Sanctions & Discipline",
        columns,
        rows: result.rows
      });
      return;
    }

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
