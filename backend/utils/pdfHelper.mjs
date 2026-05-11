import PDFDocument from "pdfkit";

/**
 * Génère un rapport PDF stylisé et professionnel.
 * @param {Object} res Stream de réponse Express
 * @param {Object} data Données du rapport
 * @param {string} data.title Titre principal du rapport
 * @param {Array} data.columns Définition des colonnes [{header, key, width}]
 * @param {Array} data.rows Données à afficher
 * @param {Object} data.metadata Métadonnées optionnelles (period, service, etc.)
 */
export async function generateReportPDF(res, { title, columns, rows, metadata = {} }) {
  const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });

  // Pipe vers la réponse Express
  doc.pipe(res);

  // Couleurs et Thème
  const primaryColor = "#1e293b"; // Slate-800
  const accentColor = "#4f46e5";  // Indigo-600
  const textColor = "#334155";    // Slate-700
  const lightTextColor = "#64748b"; // Slate-500
  const borderColor = "#e2e8f0";   // Slate-200
  const headerBg = "#f8fafc";      // Slate-50

  // Fonction pour dessiner l'en-tête de page
  const drawHeader = () => {
    // Nom de l'entreprise
    doc.fillColor(primaryColor).fontSize(20).font("Helvetica-Bold").text("DigitalAfrika", 40, 40);
    doc.fillColor(accentColor).fontSize(8).font("Helvetica-Bold").text("SOLUTIONS DE MANAGEMENT RH & POINTAGE", 40, 62);
    
    // Ligne de séparation
    doc.moveTo(40, 78).lineTo(555, 78).strokeColor(borderColor).lineWidth(1).stroke();
  };

  // Première page
  drawHeader();

  // Titre du Rapport
  doc.moveDown(3);
  doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text(title.toUpperCase(), { align: "center", underline: false });
  doc.moveDown(0.3);
  
  // Sous-titre / Métadonnées
  if (metadata.period || metadata.service) {
    let metaText = [];
    if (metadata.period) metaText.push(`Période : ${metadata.period}`);
    if (metadata.service) metaText.push(`Service : ${metadata.service}`);
    
    doc.fillColor(lightTextColor).fontSize(10).font("Helvetica-Bold").text(metaText.join("  |  "), { align: "center" });
  }
  doc.moveDown(1.5);

  // Configuration du Tableau
  const startX = 40;
  const tableWidth = 515;
  // Calculer les largeurs relatives si non spécifiées
  const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
  const colWidths = columns.map(col => (col.width || 1) * (tableWidth / totalWeight));

  // Fonction pour dessiner l'en-tête du tableau
  const drawTableHeader = (y) => {
    doc.rect(startX, y, tableWidth, 24).fill(primaryColor);
    let currentX = startX;
    columns.forEach((col, i) => {
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold").text(col.header.toUpperCase(), currentX + 5, y + 8, {
        width: colWidths[i] - 10,
        align: "left"
      });
      currentX += colWidths[i];
    });
    return y + 24;
  };

  let currentY = doc.y;
  currentY = drawTableHeader(currentY);

  // Remplissage des lignes
  if (rows.length === 0) {
    doc.moveDown();
    doc.fillColor(lightTextColor).fontSize(10).font("Helvetica-Oblique").text("Aucune donnée disponible pour cette sélection.", { align: "center" });
  } else {
    rows.forEach((row, rowIndex) => {
      const rowHeight = 20;

      // Gestion du saut de page
      if (currentY > 740) {
        doc.addPage();
        drawHeader();
        currentY = 100;
        currentY = drawTableHeader(currentY);
      }

      // Zebra striping
      if (rowIndex % 2 === 1) {
        doc.rect(startX, currentY, tableWidth, rowHeight).fill(headerBg);
      }

      // Ligne de séparation horizontale (très fine)
      doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).strokeColor(borderColor).lineWidth(0.5).stroke();

      let currentX = startX;
      columns.forEach((col, i) => {
        let val = row[col.key];
        if (val === undefined || val === null) val = "-";
        
        // Formatage spécial pour certains statuts si nécessaire
        if (col.key === 'statut') {
            const status = String(val).toLowerCase();
            if (status.includes('retard') || status.includes('rejet')) doc.fillColor('#e11d48'); // Rose-600
            else if (status.includes('present') || status.includes('approuv')) doc.fillColor('#059669'); // Emerald-600
            else doc.fillColor(textColor);
        } else {
            doc.fillColor(textColor);
        }

        doc.fontSize(8).font("Helvetica").text(String(val), currentX + 5, currentY + 6, {
          width: colWidths[i] - 10,
          align: "left",
          lineBreak: false
        });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
    });
  }

  // Numérotation des pages (à faire à la fin car bufferPages: true)
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    
    // Ligne décorative en bas
    doc.moveTo(40, 775).lineTo(555, 775).strokeColor(borderColor).lineWidth(0.5).stroke();

    doc.fillColor(lightTextColor).fontSize(7).font("Helvetica").text(
      `Rapport généré automatiquement par DigitalAfrika Pointage le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      40, 785, { align: "left" }
    );

    doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text(
      `Page ${i + 1} sur ${range.count}`,
      40, 785, { align: "right", width: 515 }
    );
  }

  doc.end();
}
