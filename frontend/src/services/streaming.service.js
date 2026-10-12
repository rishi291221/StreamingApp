import axios from 'axios';
import { STREAMING_API_URL, STREAMING_PUBLIC_URL } from '../config/env';

const streamingApi = axios.create({
  baseURL: STREAMING_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

streamingApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

streamingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

const buildPlaybackUrl = (value) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('http')) {
    return value;
  }

  const base = STREAMING_PUBLIC_URL.replace(/\/$/, '');
  const path = value.startsWith('/') ? value : '/' + value;

  return base + path;
};

export const streamingService = {
  async getFeaturedVideos() {
    const response = await streamingApi.get('/videos/featured');
    return response.data.videos || [];
  },

  async getVideos(params = {}) {
    const response = await streamingApi.get('/videos', { params });
    return response.data.videos || [];
  },

  async getVideoDetails(videoId) {
    const response = await streamingApi.get('/videos/' + videoId);
    return response.data.video;
  },

  getPlaybackUrl(videoOrPath) {
    if (!videoOrPath) {
      return '';
    }

    if (typeof videoOrPath === 'string') {
      return buildPlaybackUrl(videoOrPath);
    }

    const playbackPath =
      videoOrPath.streamUrl ||
      videoOrPath.streamPath ||
      '/api/streaming/stream/' + videoOrPath._id;

    return buildPlaybackUrl(playbackPath);
  },
};
