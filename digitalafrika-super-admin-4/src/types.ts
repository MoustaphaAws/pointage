export type UserRole = 'employee' | 'admin' | 'superadmin';

export interface AdminPermissions {
  canPoint: boolean;
  canApplySanctions: boolean;
  canValidateAbsences: boolean;
  canManageEmployees: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  service: string;
  poste?: string;
  active: boolean;
  adminPermissions?: AdminPermissions;
  createdAt?: string;
}

export interface KPI {
  absenteeismRate: number;
  lateArrivalsCount: number;
  pendingAbsences: number;
  monthlyOvertimeHours: number;
  estimatedOvertimeCost: number;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  type: 'badge_scan' | 'absence_request' | 'rh_validation' | 'sanction' | 'alert';
  userName: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Absence {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'overridden';
  rhId?: string;
  rhName?: string;
  justificationUrl?: string;
  comment?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  details: string;
}
