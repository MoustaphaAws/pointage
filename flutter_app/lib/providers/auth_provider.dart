import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../models/models.dart';
import '../services/api_client.dart';

// ─── Auth State ───
class AuthState {
  final Employee? user;
  final String? token;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.token, this.isLoading = false, this.error});

  AuthState copyWith({Employee? user, String? token, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  bool get isAuthenticated => user != null && token != null;
}

// ─── Auth Notifier ───
class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthNotifier() : super(AuthState()) {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    state = state.copyWith(isLoading: true);
    try {
      final token = await _storage.read(key: 'token');
      final firstName = await _storage.read(key: 'user_firstName');
      final lastName = await _storage.read(key: 'user_lastName');
      final userEmail = await _storage.read(key: 'user_email');
      final userRole = await _storage.read(key: 'user_role');
      final userId = await _storage.read(key: 'user_id');
      final userMatricule = await _storage.read(key: 'user_matricule');
      final userServiceId = await _storage.read(key: 'user_serviceId');
      final userServiceName = await _storage.read(key: 'user_serviceName');
      final userPoste = await _storage.read(key: 'user_poste');
      final userTypeContrat = await _storage.read(key: 'user_typeContrat');
      final heureDebut = await _storage.read(key: 'user_heureDebut');
      final heureFin = await _storage.read(key: 'user_heureFin');
      final dateEmbauche = await _storage.read(key: 'user_dateEmbauche');

      if (token != null && firstName != null) {
        final user = Employee(
          id: userId ?? '',
          matricule: userMatricule ?? '',
          firstName: firstName,
          lastName: lastName ?? '',
          email: userEmail ?? '',
          role: userRole ?? 'employee',
          serviceId: userServiceId ?? '',
          serviceName: userServiceName,
          poste: userPoste ?? '',
          typeContrat: userTypeContrat ?? 'CDI',
          heureDebut: heureDebut ?? '08:00',
          heureFin: heureFin ?? '17:00',
          dateEmbauche: dateEmbauche ?? '',
        );
        state = state.copyWith(user: user, token: token, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ApiClient();
      final response = await api.login(email, password);
      final data = response.data;

      final token = data['token'] as String;
      final user = Employee.fromJson(data['user']);

      // Persist all user fields
      await _storage.write(key: 'token', value: token);
      await _storage.write(key: 'user_id', value: user.id);
      await _storage.write(key: 'user_matricule', value: user.matricule);
      await _storage.write(key: 'user_firstName', value: user.firstName);
      await _storage.write(key: 'user_lastName', value: user.lastName);
      await _storage.write(key: 'user_email', value: user.email);
      await _storage.write(key: 'user_role', value: user.role);
      await _storage.write(key: 'user_serviceId', value: user.serviceId);
      await _storage.write(key: 'user_serviceName', value: user.serviceName ?? '');
      await _storage.write(key: 'user_poste', value: user.poste);
      await _storage.write(key: 'user_typeContrat', value: user.typeContrat);
      await _storage.write(key: 'user_heureDebut', value: user.heureDebut);
      await _storage.write(key: 'user_heureFin', value: user.heureFin);
      await _storage.write(key: 'user_dateEmbauche', value: user.dateEmbauche);

      state = state.copyWith(user: user, token: token, isLoading: false);
    } catch (e) {
      String errorMsg = 'Identifiants invalides';
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          errorMsg = 'Email ou mot de passe incorrect.';
        } else if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
          errorMsg = 'Erreur réseau : délai de connexion dépassé.';
        } else if (e.response?.data != null && e.response?.data is Map && e.response?.data['message'] != null) {
          errorMsg = e.response?.data['message'];
        } else {
          errorMsg = 'Une erreur serveur est survenue.';
        }
      } else if (e is Exception) {
        errorMsg = 'Une erreur inattendue est survenue.';
      }
      state = state.copyWith(isLoading: false, error: errorMsg);
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = AuthState();
  }
}

// ─── Providers ───
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

final currentUserProvider = Provider<Employee?>((ref) {
  return ref.watch(authProvider).user;
});

final authTokenProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).token;
});

final apiClientProvider = Provider<ApiClient?>((ref) {
  final token = ref.watch(authTokenProvider);
  if (token == null) return null;
  return ApiClient(
    token: token,
    onUnauthorized: () {
      ref.read(authProvider.notifier).logout();
    },
  );
});
