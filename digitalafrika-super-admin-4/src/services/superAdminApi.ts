import api from "./api";
import { ActivityFeedItem, AdminPermissions, AuditLog, User } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AppSettings {
  lateThreshold: number;
  lateWarningThreshold: number;
  lateSanctionThreshold: number;
  absenceThreshold: number;
  absenceSanctionThreshold: number;
  defaultEntry: string;
  defaultExit: string;
  requireJustification: boolean;
  notifyOnAbsence3Days: boolean;
  notifySuspiciousRhValidation: boolean;
  /** Minutes de retard minimum pour compter dans le KPI « Retards » du tableau de bord (jour en cours). */
  dashboardLateMinutesMin: number;
  /** Coût estimé d'une heure supplémentaire (FCFA), pour le KPI « Coût heures sup » du mois. */
  overtimeHourlyRateFcfa: number;
  /** Data URL (PNG/JPEG) — stocké côté serveur sous `company_logo` */
  logoBase64?: string;
}

export interface GlobalStats {
  employees: number;
  admins: number;
  activeUsers: number;
  absenteeismRate: number;
  pendingAbsences: number;
  lateArrivalsCount: number;
  monthlyOvertimeHours: number;
  estimatedOvertimeCost: number;
  /** Seuil minutes utilisé pour le KPI retards (renvoyé par l’API pour affichage). */
  lateDashboardMinutesThreshold?: number;
  /** Taux FCFA/h utilisé pour le coût estimé des heures sup. */
  overtimeHourlyRateFcfa?: number;
  serviceActivity?: Array<{ name: string; current: number; total: number }>;
  criticalAlerts?: number;
}

export interface Referentials {
  services: string[];
  postes: string[];
}

export const defaultAdminPermissions: AdminPermissions = {
  canPoint: false,
  canApplySanctions: false,
  canValidateAbsences: false,
  canManageEmployees: false,
};

export const defaultSettings: AppSettings = {
  lateThreshold: 3,
  lateWarningThreshold: 5,
  lateSanctionThreshold: 6,
  absenceThreshold: 1,
  absenceSanctionThreshold: 2,
  defaultEntry: "08:30",
  defaultExit: "17:30",
  requireJustification: true,
  notifyOnAbsence3Days: true,
  notifySuspiciousRhValidation: true,
  dashboardLateMinutesMin: 15,
  overtimeHourlyRateFcfa: 4000,
};

export async function loginSuperAdmin(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

export async function fetchUsers(): Promise<User[]> {
  const response = await api.get("/admin/admins");
  return response.data;
}

export async function suspendUser(id: string): Promise<void> {
  await api.put(`/admin/admins/${id}/suspend`);
}

export async function updateUserRole(
  id: string,
  role: "admin" | "employee",
  adminPermissions?: AdminPermissions
): Promise<void> {
  await api.put(`/admin/admins/${id}`, {
    role,
    adminPermissions,
  });
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const response = await api.get("/admin/audit-logs");
  return response.data;
}

export async function fetchAuditLogsFiltered(filters: {
  q?: string;
  action?: string;
  actions?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "user_name" | "action" | "target";
  sortOrder?: "asc" | "desc";
}): Promise<{ items: AuditLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const response = await api.get("/admin/audit-logs", { params: filters });
  return response.data;
}

export async function exportAuditLogsCsv(filters: {
  q?: string;
  action?: string;
  actions?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Blob> {
  const response = await api.get("/admin/audit-logs/export", {
    params: filters,
    responseType: "blob",
  });
  return response.data;
}

export async function fetchSettings(): Promise<AppSettings> {
  const response = await api.get("/admin/config");
  return {
    ...defaultSettings,
    ...response.data,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await api.put("/admin/config", settings);
}

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const response = await api.get("/admin/stats/global");
  return response.data;
}

export async function fetchActivityFeed(): Promise<ActivityFeedItem[]> {
  const response = await api.get("/admin/activity");
  return response.data;
}

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "employee";
  service: string;
  poste?: string;
  password: string;
  adminPermissions?: AdminPermissions;
}): Promise<User> {
  const response = await api.post("/admin/admins", payload);
  return response.data;
}

export async function updateUser(id: string, payload: {
  firstName?: string;
  lastName?: string;
  role?: "admin" | "employee";
  service?: string;
  poste?: string;
  adminPermissions?: AdminPermissions;
}): Promise<void> {
  await api.put(`/admin/admins/${id}`, payload);
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await api.put(`/admin/admins/${id}/reset-password`, { password });
}

export async function fetchReferentials(): Promise<Referentials> {
  const response = await api.get("/admin/referentials");
  return response.data;
}

export async function addReferentialValue(kind: "services" | "postes", value: string): Promise<string[]> {
  const response = await api.post(`/admin/referentials/${kind}`, { value });
  return response.data.items;
}

export async function deleteReferentialValue(kind: "services" | "postes", value: string): Promise<string[]> {
  const response = await api.delete(`/admin/referentials/${kind}/${encodeURIComponent(value)}`);
  return response.data.items;
}

export async function exportGlobalReport(params: {
  type: "absences" | "pointages" | "disciplinaire";
  format: "csv" | "pdf";
  month: string;
  service: string;
}): Promise<Blob> {
  const response = await api.get("/admin/export/global", {
    params,
    responseType: "blob",
  });
  return response.data;
}

export interface EmployeeActivityItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  details: string;
}

export interface AbsenceItem {
  id: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  motif: string;
  validePar: string;
  createdAt: string;
}

export interface PointageItem {
  id: string;
  date: string;
  entree: string;
  sortie: string;
  type: string;
  heuresTravaillees: number;
  heuresSup: number;
  commentaire: string;
}

export interface SanctionItem {
  id: string;
  type: string;
  motif: string;
  dateIncident: string;
  dateDecision: string;
  statut: string;
  decisionneePar: string;
}

export interface EmployeeStats {
  totalAbsences: number;
  totalPointages: number;
  totalSanctions: number;
  joursAbsence: number;
  heuresTravaillees: string;
  heuresSup: string;
}

export interface EmployeeDetailsResponse {
  profile: User;
  stats: EmployeeStats;
  activity: EmployeeActivityItem[];
  absences: AbsenceItem[];
  pointages: PointageItem[];
  sanctions: SanctionItem[];
}

export async function fetchEmployeeDetails(id: string): Promise<EmployeeDetailsResponse> {
  const response = await api.get(`/admin/employees/${encodeURIComponent(id)}`);
  return response.data;
}

export async function fetchCurrentSuperAdmin(): Promise<User> {
  const response = await api.get("/admin/me");
  return response.data;
}

export async function updateCurrentSuperAdmin(payload: {
  firstName?: string;
  lastName?: string;
  email?: string;
  service?: string;
  poste?: string;
  password?: string;
}): Promise<User> {
  const response = await api.put("/admin/me", payload);
  return response.data;
}

/**
 * Supprime tous les utilisateurs (employés et admins RH) sauf le SuperAdmin courant.
 * Cette action est irréversible.
 */
export async function resetAllUsers(): Promise<void> {
  await api.delete("/admin/reset-users");
}