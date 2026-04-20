import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import 'auth_provider.dart';

// ─── Employee Stats (month) ───
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

// ─── Today Pointage ───
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

// ─── Employee Absences ───
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

// ─── Admin: Global Stats ───
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

// ─── Admin: All Absences ───
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
