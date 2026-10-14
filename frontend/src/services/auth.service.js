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
      const response = await api.post('/login', { email, password });
      const data = response.data;

      if (data.success === false) {
        return {
          success: false,
          message: data.message || 'Login failed.',
        };
      }

      const user = data.user;
      const token = data.token;

      persistUser(user, token);

      return {
        ...data,
        success: data.success ?? true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Login failed.'),
      };
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Registration failed.'),
      };
    }
  },

  async forgotPassword(email) {
    try {
      const payload =
        typeof email === 'string' ? { email } : email;

      const response = await api.post('/forgetPassword', payload);
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
    } catch (error)
