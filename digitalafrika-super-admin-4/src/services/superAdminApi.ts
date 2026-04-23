import api from "./api";
import { ActivityFeedItem, AuditLog, User } from "../types";

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
}

export interface Referentials {
  services: string[];
  postes: string[];
}

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

export async function updateUserRole(id: string, role: "admin" | "employee"): Promise<void> {
  await api.put(`/admin/admins/${id}`, { role });
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
  badgeUid?: string;
  password: string;
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
  badgeUid?: string;
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
