/**
 * Formate une colonne TIMESTAMP/TIME renvoyée par PostgreSQL pour affichage HH:MM (UI / exports).
 * Évite les exceptions si la valeur est ambiguë ou invalide (comportement aligné sur formatPointage).
 */
export function formatTimeHHMM(val) {
  if (val == null || val === "") return "";
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? "" : val.toISOString().slice(11, 16);
  }
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(str)) {
    const parts = str.split(":");
    const h = String(parts[0]).padStart(2, "0").slice(-2);
    const m = String(parts[1] ?? "0").padStart(2, "0").slice(0, 2);
    return `${h}:${m}`;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(11, 16);
}
