import { api } from './api';

const persistUser = (user, token) => {
  if (token) {
    localStorage.setItem('token', token);
  }

  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback;

export const authService = {
  async login(email, password) {
    try {
      const response = await api.post('/login', {
        email,
        password,
      });

      const data = response.data;

      if (data.success === false) {
        return {
          ...data,
          success: false,
          error: data.message || 'Login failed.',
        };
      }

      persistUser(data.user, data.token);

      return {
        ...data,
        success: true,
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Login failed.'),
      };
    }
  },

  async register(userData) {
    const response = await api.post('/register', userData);
    const data = response.data;

    if (data.success === false) {
      const error = new Error(
        data.message || 'Registration failed.'
      );
      throw error;
    }

    return data;
  },

  async forgotPassword(payload) {
    try {
      const body =
        typeof payload === 'string'
          ? { email: payload }
          : payload;

      const response = await api.post('/forgetPassword', body);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(
          error,
          'Password recovery request failed.'
        ),
      };
    }
  },

  async verifyToken() {
    try {
      const response = await api.get('/verify');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(
          error,
          'Token verification failed.'
        ),
      };
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('token'));
  },
};
