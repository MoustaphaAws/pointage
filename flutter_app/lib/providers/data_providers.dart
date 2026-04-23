import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import 'auth_provider.dart';

// ════════════════════════════════════════════════════════════
// EMPLOYÉ — Providers
// ════════════════════════════════════════════════════════════

// ─── Stats mensuelles ───
final monthStatsProvider = FutureProvider<MonthStats?>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return null;
  try {
    final response = await api.getMonthStats();
    return MonthStats.fromJson(response.data);
  } catch (e) {
    return null;
  }
});

// ─── Pointage du jour ───
final todayPointageProvider = FutureProvider<Pointage?>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return null;
  try {
    final response = await api.getTodayPointage();
    return Pointage.fromJson(response.data);
  } catch (e) {
    return null;
  }
});

// ─── Historique pointages ───
final pointageHistoryProvider = FutureProvider<List<Pointage>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getPointageHistory();
    return (response.data as List).map((e) => Pointage.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Mes absences ───
final myAbsencesProvider = FutureProvider<List<Absence>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getMyAbsences();
    return (response.data as List).map((e) => Absence.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Mes notifications ───
final myNotificationsProvider = FutureProvider<List<AppNotification>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getNotifications();
    return (response.data as List).map((e) => AppNotification.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Notifications non lues (count) ───
final unreadNotifCountProvider = Provider<int>((ref) {
  final notifs = ref.watch(myNotificationsProvider);
  return notifs.when(
    data: (list) => list.where((n) => !n.lue).length,
    loading: () => 0,
    error: (_, __) => 0,
  );
});

// ─── Mes sanctions ───
final mySanctionsProvider = FutureProvider<List<Sanction>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getMySanctions();
    return (response.data as List).map((e) => Sanction.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ════════════════════════════════════════════════════════════
// ADMIN — Providers
// ════════════════════════════════════════════════════════════

// ─── Stats globales ───
final globalStatsProvider = FutureProvider<GlobalStats?>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return null;
  try {
    final response = await api.getGlobalStats();
    return GlobalStats.fromJson(response.data);
  } catch (e) {
    return null;
  }
});

// ─── Toutes les absences ───
final allAbsencesProvider = FutureProvider<List<Absence>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getAllAbsences();
    return (response.data as List).map((e) => Absence.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Absences en attente ───
final pendingAbsencesProvider = Provider<AsyncValue<List<Absence>>>((ref) {
  final allAbsences = ref.watch(allAbsencesProvider);
  return allAbsences.whenData(
    (list) => list.where((a) => a.isPending).toList(),
  );
});

// ─── Liste des employés ───
final allEmployeesProvider = FutureProvider<List<Employee>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getEmployees();
    return (response.data as List).map((e) => Employee.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Présences temps réel ───
final livePointagesProvider = FutureProvider<List<Pointage>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getLivePointages();
    return (response.data as List).map((e) => Pointage.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Toutes les sanctions ───
final allSanctionsProvider = FutureProvider<List<Sanction>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getAllSanctions();
    return (response.data as List).map((e) => Sanction.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Sanctions actives (alertes non traitées) ───
final activeSanctionsProvider = Provider<AsyncValue<List<Sanction>>>((ref) {
  final all = ref.watch(allSanctionsProvider);
  return all.whenData((list) => list.where((s) => s.isAlerte).toList());
});

// ════════════════════════════════════════════════════════════
// COMMUNS — Services, Types absence, Jours fériés
// ════════════════════════════════════════════════════════════

// ─── Services ───
final servicesProvider = FutureProvider<List<Service>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getServices();
    return (response.data as List).map((e) => Service.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Types d'absence ───
final typesAbsenceProvider = FutureProvider<List<TypeAbsence>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getTypesAbsence();
    return (response.data as List).map((e) => TypeAbsence.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Jours fériés ───
final joursFeriesProvider = FutureProvider<List<JourFerie>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getJoursFeries();
    return (response.data as List).map((e) => JourFerie.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

// ─── Badges ───
final badgesProvider = FutureProvider<List<Badge>>((ref) async {
  final api = ref.watch(apiClientProvider);
  if (api == null) return [];
  try {
    final response = await api.getBadges();
    return (response.data as List).map((e) => Badge.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});
