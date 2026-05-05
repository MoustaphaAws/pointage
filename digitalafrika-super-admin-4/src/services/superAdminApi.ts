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
  absenceThreshold: number;
  defaultEntry: string;
  defaultExit: string;
  requireJustification: boolean;
  notifyOnAbsence3Days: boolean;
  notifySuspiciousRhValidation: boolean;
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
  absenceThreshold: 5,
  defaultEntry: "08:30",
  defaultExit: "17:30",
  requireJustification: true,
  notifyOnAbsence3Days: true,
  notifySuspiciousRhValidation: true,
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
  try {
    const response = await api.get(`/admin/employees/${id}`);
    return response.data;
  } catch {
    const users = await fetchUsers();
    let user = users.find((item) => String(item.id) === String(id));
    if (!user) {
      const decoded = decodeURIComponent(String(id || "")).trim().toLowerCase();
      if (decoded.includes("@")) {
        user = users.find((item) => item.email.toLowerCase() === decoded);
      }
    }
    if (!user) {
      throw new Error("Employé introuvable");
    }

    const fullName = `${user.firstName} ${user.lastName}`.trim();
    let activity: EmployeeActivityItem[] = [];
    try {
      const logs = await fetchAuditLogsFiltered({
        q: fullName,
        page: 1,
        pageSize: 50,
        sortBy: "created_at",
        sortOrder: "desc",
      });
      activity = logs.items.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        actor: log.userName,
        target: log.target,
        details: log.details,
      }));
    } catch {
      // Non bloquant en production: afficher le profil même si le service logs est indisponible.
      activity = [];
    }

    return {
      profile: user,
      stats: {
        totalAbsences: 0,
        totalPointages: 0,
        totalSanctions: 0,
        joursAbsence: 0,
        heuresTravaillees: "0",
        heuresSup: "0",
      },
      activity,
      absences: [],
      pointages: [],
      sanctions: [],
    };
  }
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
