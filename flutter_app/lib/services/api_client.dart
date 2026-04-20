import 'package:dio/dio.dart';

class ApiClient {
  final String? token;
  
  ApiClient({this.token});

  // ─── Mock Data ───
  static final _adminUser = {
    'id': '1',
    'email': 'admin@propointage.com',
    'role': 'admin',
    'name': 'Jean Admin',
    'service': 'RH',
  };
  
  static final _empUser = {
    'id': '2',
    'email': 'emp@propointage.com',
    'role': 'employee',
    'name': 'Alice Doe',
    'service': 'Tech',
  };

  static final _mockPointage = {
    'id': '1',
    'date': DateTime.now().toIso8601String().split('T')[0],
    'checkIn': '09:15',
    'checkOut': '17:30',
    'status': 'retard',
    'delayMinutes': 15,
  };

  static final List<Map<String, dynamic>> _mockAbsences = [
    {
      'id': '1',
      'userId': '2',
      'userName': 'Alice Doe',
      'type': 'Congé payé',
      'startDate': '2026-04-25',
      'endDate': '2026-04-30',
      'status': 'en attente',
      'reason': 'Vacances famille',
    }
  ];

  // Helper to create fake Dio responses
  Future<Response> _mockResponse(dynamic data, {int statusCode = 200}) async {
    await Future.delayed(const Duration(milliseconds: 600)); // Simulate network latency
    if (statusCode >= 400) {
      throw DioException(
        requestOptions: RequestOptions(path: ''),
        response: Response(
          requestOptions: RequestOptions(path: ''),
          statusCode: statusCode,
          data: data,
        ),
      );
    }
    return Response(
      requestOptions: RequestOptions(path: ''),
      statusCode: statusCode,
      data: data,
    );
  }

  // ─── Auth ───
  Future<Response> login(String email, String password) async {
    if (email == 'admin@propointage.com' && password == 'admin123') {
      return _mockResponse({'token': 'mock_admin_token', 'user': _adminUser});
    } else if (email == 'emp@propointage.com' && password == 'emp123') {
      return _mockResponse({'token': 'mock_emp_token', 'user': _empUser});
    }
    return _mockResponse({'message': 'Identifiants invalides'}, statusCode: 401);
  }

  Future<Response> logout() => _mockResponse({'message': 'Logged out'});

  // ─── Pointages ───
  Future<Response> getTodayPointage() => _mockResponse(_mockPointage);
  Future<Response> getPointageHistory() => _mockResponse([_mockPointage]);
  Future<Response> getAllPointages() => _mockResponse([_mockPointage]);
  Future<Response> getLivePointages() => _mockResponse([_mockPointage]);

  // ─── Absences ───
  Future<Response> requestAbsence(Map<String, dynamic> data) async {
    final newAbsence = {
      ...data,
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'userId': '2',
      'userName': 'Alice Doe',
      'status': 'en attente',
    };
    _mockAbsences.add(newAbsence);
    return _mockResponse(newAbsence, statusCode: 201);
  }
  
  Future<Response> getMyAbsences() => _mockResponse(
      _mockAbsences.where((a) => a['userId'] == '2').toList());
      
  Future<Response> getAllAbsences() => _mockResponse(_mockAbsences);
  
  Future<Response> validateAbsence(String id, String status, {String? motive}) async {
    final index = _mockAbsences.indexWhere((a) => a['id'] == id);
    if (index != -1) {
      _mockAbsences[index]['status'] = status;
      if (motive != null) _mockAbsences[index]['motive'] = motive;
      return _mockResponse(_mockAbsences[index]);
    }
    return _mockResponse({'message': 'Introuvable'}, statusCode: 404);
  }

  // ─── Stats ───
  Future<Response> getMonthStats() => _mockResponse({
    'joursTravailles': 14,
    'heuresTotales': 112,
    'retards': 4,
    'soldeConges': 25,
  });

  Future<Response> getGlobalStats() => _mockResponse({
    'tauxAbsenteisme': 5.2,
    'retardsAujourdhui': 4,
    'presenceTempsReel': 85,
    'notificationsPending': _mockAbsences.where((a) => a['status'] == 'en attente').length,
  });

  // ─── Employees ───
  Future<Response> getEmployees() => _mockResponse([_empUser]);
}
