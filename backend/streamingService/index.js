const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  'http://localhost:3000'
)
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(normalizeOrigin(origin));
};

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }

  console.error('Streaming CORS rejected origin:', origin);
  return callback(new Error('Not allowed by CORS'));
};

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json());

// Database connection
const { connectDB } = require('./db');

connectDB();

// Routes
const healthRoutes = require('./routes/health.route');
const streamingRoutes = require('./routes/streaming.route');

app.use('/api/health', healthRoutes);
app.use('/api/streaming', streamingRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Streaming service error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Streaming service running on port ${PORT}`);
  console.log('Allowed frontend origins:', allowedOrigins);
});
