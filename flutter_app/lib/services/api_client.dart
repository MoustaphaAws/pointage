import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Client API réel — Connexion HTTP vers le backend Express
class ApiClient {
  final String? token;
  late final Dio _dio;

  // URL dynamique selon l'environnement
  static String get _baseUrl {
    const defined = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (defined.isNotEmpty) return defined;

    // Production & Default Dev: Render
    return 'https://pointage-ufj2.onrender.com/api';
  }

  final VoidCallback? onUnauthorized;

  ApiClient({this.token, this.onUnauthorized}) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          if (onUnauthorized != null) {
            onUnauthorized!();
          }
        }
        return handler.next(e);
      },
    ));
  }

  // ════════════════════════════════════════════════════════════
  // 1. AUTH
  // ════════════════════════════════════════════════════════════

  Future<Response> login(String email, String password) =>
      _dio.post('/auth/login', data: {'email': email, 'password': password});

  Future<Response> logout() => _dio.post('/auth/logout');

  Future<Response> forgotPassword(String email) =>
      _dio.post('/auth/forgot-password', data: {'email': email});

  Future<Response> resetPassword(String token, String newPassword) =>
      _dio.post('/auth/reset-password', data: {'token': token, 'newPassword': newPassword});

  Future<Response> changePassword(String oldPassword, String newPassword) =>
      _dio.put('/auth/change-password', data: {'oldPassword': oldPassword, 'newPassword': newPassword});

  // ════════════════════════════════════════════════════════════
  // 2. PROFIL
  // ════════════════════════════════════════════════════════════

  Future<Response> getProfile() => _dio.get('/profile/me');

  Future<Response> updateProfile(Map<String, dynamic> data) =>
      _dio.put('/profile/me', data: data);

  Future<Response> uploadPhoto(String filePath) async {
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(filePath),
    });
    return _dio.post('/profile/me/photo', data: formData);
  }

  // ════════════════════════════════════════════════════════════
  // 3. POINTAGES
  // ════════════════════════════════════════════════════════════

  Future<Response> getTodayPointage() => _dio.get('/pointages/today');

  Future<Response> getPointageHistory({String? start, String? end}) =>
      _dio.get('/pointages/history', queryParameters: {
        if (start != null) 'start': start,
        if (end != null) 'end': end,
      });

  Future<Response> getAllPointages({String? serviceId, String? start, String? end}) =>
      _dio.get('/pointages/all', queryParameters: {
        if (serviceId != null) 'service': serviceId,
        if (start != null) 'start': start,
        if (end != null) 'end': end,
      });

  Future<Response> getLivePointages() => _dio.get('/pointages/live');

  Future<Response> getPointagesByEmployee(String employeeId, {String? start, String? end}) =>
      _dio.get('/pointages/employee/$employeeId', queryParameters: {
        if (start != null) 'start': start,
        if (end != null) 'end': end,
      });

  // ════════════════════════════════════════════════════════════
  // 4. QR CODE POINTAGE
  // ════════════════════════════════════════════════════════════

  Future<Response> getDailyQr() => _dio.get('/pointages/qr/daily');

  Future<Response> regenerateDailyQr() => _dio.post('/pointages/qr/regenerate');

  Future<Response> validateQrPointage(String qrData) =>
      _dio.post('/pointages/qr/validate', data: {'qrData': qrData});

  // ════════════════════════════════════════════════════════════
  // 5. ABSENCES
  // ════════════════════════════════════════════════════════════

  Future<Response> requestAbsence(Map<String, dynamic> data) =>
      _dio.post('/absences', data: data);

  Future<Response> getMyAbsences({String? status}) =>
      _dio.get('/absences/me', queryParameters: {
        if (status != null) 'status': status,
      });

  Future<Response> cancelAbsence(String id) =>
      _dio.put('/absences/$id/cancel');

  Future<Response> getAllAbsences({String? serviceId, String? status}) =>
      _dio.get('/absences/all', queryParameters: {
        if (serviceId != null) 'service': serviceId,
        if (status != null) 'status': status,
      });

  Future<Response> approveAbsence(String id) =>
      _dio.put('/absences/$id/approve');

  Future<Response> rejectAbsence(String id, String motifRejet) =>
      _dio.put('/absences/$id/reject', data: {'motifRejet': motifRejet});

  Future<Response> getAbsencesByEmployee(String employeeId) =>
      _dio.get('/absences/employee/$employeeId');

  // Backward compatibility
  Future<Response> validateAbsence(String id, String status, {String? motive}) {
    if (status == 'approuvee' || status == 'validé') return approveAbsence(id);
    return rejectAbsence(id, motive ?? 'Rejeté par l\'admin');
  }

  // ════════════════════════════════════════════════════════════
  // 6. JUSTIFICATIFS
  // ════════════════════════════════════════════════════════════

  Future<Response> uploadJustificatif(String absenceId, String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    return _dio.post('/justificatifs/upload/$absenceId', data: formData);
  }

  Future<Response> validateJustificatif(String id) =>
      _dio.put('/justificatifs/$id/validate');

  Future<Response> rejectJustificatif(String id, String motif) =>
      _dio.put('/justificatifs/$id/reject', data: {'motifRejet': motif});

  /// Build the full URL to view/download a justificatif file
  String getJustificatifFileUrl(String filename) {
    return '$_baseUrl/justificatifs/file/$filename';
  }

  /// Get the auth headers for authenticated file requests
  Map<String, String> get authHeaders => {
    if (token != null) 'Authorization': 'Bearer $token',
  };

  /// Download justificatif file as bytes
  Future<Response> downloadJustificatifFile(String filename) =>
      _dio.get(
        '/justificatifs/file/$filename',
        options: Options(responseType: ResponseType.bytes),
      );

  // ════════════════════════════════════════════════════════════
  // 7. EMPLOYÉS (Admin)
  // ════════════════════════════════════════════════════════════

  Future<Response> getEmployees({String? serviceId, String? status, String? search, String? contrat}) =>
      _dio.get('/employees', queryParameters: {
        if (serviceId != null) 'service': serviceId,
        if (status != null) 'status': status,
        if (search != null) 'search': search,
        if (contrat != null) 'contrat': contrat,
      });

  Future<Response> getEmployeeById(String id) =>
      _dio.get('/employees/$id');

  Future<Response> createEmployee(Map<String, dynamic> data) =>
      _dio.post('/employees', data: data);

  Future<Response> updateEmployee(String id, Map<String, dynamic> data) =>
      _dio.put('/employees/$id', data: data);

  Future<Response> deactivateEmployee(String id) =>
      _dio.put('/employees/$id/deactivate');

  Future<Response> activateEmployee(String id) =>
      _dio.put('/employees/$id/activate');

  // ════════════════════════════════════════════════════════════
  // 8. BADGES
  // ════════════════════════════════════════════════════════════

  Future<Response> getBadges({String? status}) =>
      _dio.get('/badges', queryParameters: {
        if (status != null) 'status': status,
      });

  Future<Response> assignBadge(String employeeId, String uid) =>
      _dio.put('/badges/employees/$employeeId/badge', data: {'uidBadge': uid});

  Future<Response> deactivateBadge(String uid) =>
      _dio.put('/badges/$uid/deactivate');

  // ════════════════════════════════════════════════════════════
  // 9. SERVICES
  // ════════════════════════════════════════════════════════════

  Future<Response> getServices() => _dio.get('/services');

  // ════════════════════════════════════════════════════════════
  // 10. JOURS FÉRIÉS
  // ════════════════════════════════════════════════════════════

  Future<Response> getJoursFeries() => _dio.get('/jours-feries');

  Future<Response> createJourFerie(Map<String, dynamic> data) =>
      _dio.post('/jours-feries', data: data);

  Future<Response> updateJourFerie(String id, Map<String, dynamic> data) =>
      _dio.put('/jours-feries/$id', data: data);

  Future<Response> deleteJourFerie(String id) =>
      _dio.delete('/jours-feries/$id');

  // ════════════════════════════════════════════════════════════
  // 11. NOTIFICATIONS
  // ════════════════════════════════════════════════════════════

  Future<Response> getNotifications({bool? readOnly}) =>
      _dio.get('/notifications', queryParameters: {
        if (readOnly == false) 'read': 'false',
      });

  Future<Response> markNotificationRead(String id) =>
      _dio.put('/notifications/$id/read');

  Future<Response> markAllNotificationsRead() =>
      _dio.put('/notifications/read-all');

  // ════════════════════════════════════════════════════════════
  // 12. SANCTIONS
  // ════════════════════════════════════════════════════════════

  Future<Response> getMySanctions() => _dio.get('/sanctions/me');

  Future<Response> getAllSanctions({String? serviceId}) =>
      _dio.get('/sanctions/all', queryParameters: {
        if (serviceId != null) 'service': serviceId,
      });

  Future<Response> getSanctionsByEmployee(String employeeId) =>
      _dio.get('/sanctions/employee/$employeeId');

  Future<Response> traiterSanction(String id, String commentaire) =>
      _dio.put('/sanctions/$id/traiter', data: {'commentaire': commentaire});

  // ════════════════════════════════════════════════════════════
  // 13. EXPORTS
  // ════════════════════════════════════════════════════════════

  Future<Response> exportPointages({String? month, String format = 'excel'}) =>
      _dio.get('/exports/pointages', queryParameters: {
        if (month != null) 'month': month,
        'format': format,
      }, options: Options(responseType: ResponseType.bytes));

  Future<Response> exportAbsences({String? month, String format = 'pdf'}) =>
      _dio.get('/exports/absences', queryParameters: {
        if (month != null) 'month': month,
        'format': format,
      }, options: Options(responseType: ResponseType.bytes));

  Future<Response> exportPaie({String? month}) =>
      _dio.get('/exports/paie', queryParameters: {
        if (month != null) 'month': month,
      }, options: Options(responseType: ResponseType.bytes));

  Future<Response> exportDisciplinaire({String? employeeId}) =>
      _dio.get('/exports/disciplinaire', queryParameters: {
        if (employeeId != null) 'employeeId': employeeId,
      }, options: Options(responseType: ResponseType.bytes));

  // ════════════════════════════════════════════════════════════
  // 14. STATISTIQUES
  // ════════════════════════════════════════════════════════════

  Future<Response> getMonthStats() => _dio.get('/stats/month');

  Future<Response> getGlobalStats({String? serviceId}) =>
      _dio.get('/stats/global', queryParameters: {
        if (serviceId != null) 'service': serviceId,
      });

  Future<Response> getWeeklyPointages({String? serviceId}) =>
      _dio.get('/stats/weekly-pointages', queryParameters: {
        if (serviceId != null) 'service': serviceId,
      });

  // ════════════════════════════════════════════════════════════
  // 15. TYPES D'ABSENCE
  // ════════════════════════════════════════════════════════════

  Future<Response> getTypesAbsence() => _dio.get('/types-absence');
}
