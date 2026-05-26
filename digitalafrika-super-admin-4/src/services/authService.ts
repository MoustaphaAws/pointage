const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : 'https://pointage-ufj2.onrender.com/api';

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Identifiants invalides');
    }

    const data = await response.json();
    const user = data.user;

    if (!user) {
      throw new Error('Erreur d\'authentification');
    }

    if (data.token) localStorage.setItem(this.tokenKey, data.token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    
    return { ...user, token: data.token };
  }

  getCurrentUser(): any | null {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}

export const authService = new AuthService();
