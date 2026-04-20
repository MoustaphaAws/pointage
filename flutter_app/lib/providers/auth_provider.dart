import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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
      final userData = await _storage.read(key: 'user_name');
      final userEmail = await _storage.read(key: 'user_email');
      final userRole = await _storage.read(key: 'user_role');
      final userId = await _storage.read(key: 'user_id');
      final userService = await _storage.read(key: 'user_service');

      if (token != null && userData != null) {
        final user = Employee(
          id: userId ?? '',
          name: userData,
          email: userEmail ?? '',
          role: userRole ?? 'employee',
          service: userService ?? '',
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

      // Persist
      await _storage.write(key: 'token', value: token);
      await _storage.write(key: 'user_name', value: user.name);
      await _storage.write(key: 'user_email', value: user.email);
      await _storage.write(key: 'user_role', value: user.role);
      await _storage.write(key: 'user_id', value: user.id);
      await _storage.write(key: 'user_service', value: user.service);

      state = state.copyWith(user: user, token: token, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Identifiants invalides');
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = AuthState();
  }
}

// ─── Provider ───
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

// Convenience providers
final currentUserProvider = Provider<Employee?>((ref) {
  return ref.watch(authProvider).user;
});

final authTokenProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).token;
});

final apiClientProvider = Provider<ApiClient?>((ref) {
  final token = ref.watch(authTokenProvider);
  if (token == null) return null;
  return ApiClient(token: token);
});
