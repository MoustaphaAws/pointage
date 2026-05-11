import PDFDocument from "pdfkit";
import { query } from "./db.mjs";

function formatValue(val, key) {
  if (val == null) return "-";

  // Check if it's a Date object
  const isDateObject = val instanceof Date || Object.prototype.toString.call(val) === '[object Date]';
  
  if (isDateObject) {
    if (isNaN(val.getTime())) return "-";
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  
  if (typeof val === 'string') {
    // Check if it's a date string like "2026-05-11T..." or "2026-05-11"
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const dObj = new Date(val);
      if (!isNaN(dObj.getTime())) {
        const d = String(dObj.getDate()).padStart(2, '0');
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const y = dObj.getFullYear();
        return `${d}/${m}/${y}`;
      }
    }
  }

  // Formatage spécial pour les minutes (Retards / H.Sup)
  if ((key === 'retard_minutes' || key === 'heures_sup_minutes') && typeof val === 'number') {
    if (val === 0) return "-";
    return `${val} min`;
  }

  return String(val);
}

/**
 * Génère un rapport PDF avec une esthétique premium.
 */
export async function generateReportPDF(res, { title, columns, rows, metadata = {} }) {
  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
  doc.pipe(res);

  const colors = {
    brand: "#4f46e5",    // Indigo 600
    dark: "#0f172a",     // Slate 900
    text: "#334155",      // Slate 700
    muted: "#64748b",     // Slate 500
    border: "#e2e8f0",    // Slate 200
    zebra: "#f8fafc",     // Slate 50
    success: "#059669",   // Emerald 600
    danger: "#dc2626"     // Red 600
  };

  let logoBase64 = null;
  try {
    const configResult = await query("SELECT valeur FROM configurations WHERE cle = 'company_logo'");
    if (configResult.rowCount) {
      logoBase64 = configResult.rows[0].valeur;
    }
  } catch (err) {
    console.error("Erreur de récupération du logo", err);
  }

  const drawHeader = () => {
    // Petit Logo Graphique (3 carrés imbriqués pour un look moderne)
    let hasDrawnLogo = false;
    
    if (logoBase64 && logoBase64.startsWith('data:image/')) {
        try {
            const base64Data = logoBase64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            // Check size visually (assuming max width/height constraint)
            doc.image(buffer, 50, 35, { fit: [90, 45], align: 'left' });
            hasDrawnLogo = true;
        } catch (e) {
            console.error("Erreur dessin logo", e);
        }
    }

    if (!hasDrawnLogo) {
        doc.save();
        doc.translate(50, 45);
        doc.rect(0, 0, 15, 15).fill(colors.brand);
        doc.rect(18, 0, 10, 10).fill(colors.muted);
        doc.rect(0, 18, 10, 10).fill(colors.dark);
        doc.restore();
    }

    // Titre Entreprise positionné de sorte à correspondre s'il y a un logo
    const titleX = hasDrawnLogo ? 150 : 85;

    doc.fillColor(colors.dark).fontSize(22).font("Helvetica-Bold").text("DigitalAfrika", titleX, 45);
    doc.fillColor(colors.muted).fontSize(8).font("Helvetica").text("SYSTÈME D'EXPLOITATION RH & POINTAGE", titleX, 68, { characterSpacing: 1 });
    
    // Lignes de séparation
    doc.moveTo(50, 90).lineTo(545, 90).strokeColor(colors.border).lineWidth(1).stroke();
  };

  drawHeader();

  // Corps du document
  doc.moveDown(4);
  doc.fillColor(colors.dark).fontSize(18).font("Helvetica-Bold").text(title.toUpperCase(), { align: "center", characterSpacing: 1.5 });
  
  if (metadata.period || metadata.service) {
    doc.moveDown(0.5);
    const metaStr = [
        metadata.period ? `Période: ${metadata.period}` : "",
        metadata.service ? `Service: ${metadata.service}` : ""
    ].filter(Boolean).join("   •   ");
    doc.fillColor(colors.muted).fontSize(10).font("Helvetica").text(metaStr, { align: "center" });
  }
  doc.moveDown(2);

  // Table Setup
  const startX = 50;
  const tableWidth = 495;
  const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
  const colWidths = columns.map(col => (col.width || 1) * (tableWidth / totalWeight));

  const drawTableHeader = (y) => {
    doc.rect(startX, y, tableWidth, 32).fill(colors.dark);
    let currentX = startX;
    columns.forEach((col, i) => {
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text(col.header.toUpperCase(), currentX + 5, y + 11, {
        width: colWidths[i] - 10,
        align: "left"
      });
      currentX += colWidths[i];
    });
    return y + 32;
  };

  let currentY = doc.y;
  currentY = drawTableHeader(currentY);

  if (rows.length === 0) {
    doc.moveDown(3);
    doc.fillColor(colors.muted).fontSize(11).font("Helvetica-Oblique").text("Aucun enregistrement trouvé.", { align: "center" });
  } else {
    rows.forEach((row, rowIndex) => {
      const rowHeight = 26; // Hauteur suffisante pour éviter les chevauchements

      if (currentY > 710) {
        doc.addPage();
        drawHeader();
        currentY = 120;
        currentY = drawTableHeader(currentY);
      }

      // Zebra
      if (rowIndex % 2 === 1) {
        doc.rect(startX, currentY, tableWidth, rowHeight).fill(colors.zebra);
      }

      // Ligne de délimitation
      doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).strokeColor(colors.border).lineWidth(0.5).stroke();

      let currentX = startX;
      columns.forEach((col, i) => {
        let rawVal = row[col.key];
        let displayVal = formatValue(rawVal, col.key);
        
        let cellColor = colors.text;
        if (col.key === 'statut') {
            const s = String(rawVal).toLowerCase();
            if (s.includes('retard') || s.includes('rejet') || s.includes('absent')) cellColor = colors.danger;
            else if (s.includes('present') || s.includes('approuv')) cellColor = colors.success;
        }

        doc.fillColor(cellColor).fontSize(8.5).font("Helvetica").text(displayVal, currentX + 5, currentY + 9, {
          width: colWidths[i] - 10,
          align: "left",
          lineBreak: false,
          ellipsis: true
        });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
    });
  }

  // Footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    
    doc.moveTo(50, 775).lineTo(545, 775).strokeColor(colors.border).lineWidth(1).stroke();
    doc.fillColor(colors.muted).fontSize(7).font("Helvetica").text(
      `Généré par le système DigitalAfrika Core v2 - ${new Date().toLocaleString('fr-FR')}`,
      50, 785
    );
    doc.fillColor(colors.dark).fontSize(8).font("Helvetica-Bold").text(
      `PAGE ${i + 1} / ${range.count}`,
      50, 785, { align: "right", width: 495 }
    );
  }

  doc.end();
}
