import { signTokenForRole } from "../middleware/auth.mjs";

export function formatAuthUser(row) {
  return {
    id: row.id,
    matricule: row.matricule,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photo_url,
    role: row.role,
    serviceId: row.service_id,
    serviceName: row.service_name,
    service: row.service_name || "",
    poste: row.poste,
    typeContrat: row.type_contrat,
    heureDebut: row.heure_debut?.slice?.(0, 5) ?? row.heure_debut,
    heureFin: row.heure_fin?.slice?.(0, 5) ?? row.heure_fin,
    dateEmbauche: row.date_embauche,
    dateFinContrat: row.date_fin_contrat,
    actif: row.actif,
    active: row.actif,
    firstLogin: row.first_login,
    entrepriseId: row.entreprise_id,
    companyName: row.entreprise_nom || null,
    adminPermissions:
      row.role === "admin" ? row.admin_permissions || {} : undefined,
  };
}

export function authPayloadFromRow(row) {
  return {
    token: signTokenForRole(row),
    user: formatAuthUser(row),
  };
}

export const AUTH_USER_SELECT = `
  e.*, s.nom AS service_name, ent.nom AS entreprise_nom
`;

export const AUTH_USER_JOINS = `
  FROM employes e
  JOIN services s ON s.id = e.service_id
  LEFT JOIN entreprises ent ON ent.id = e.entreprise_id
`;
