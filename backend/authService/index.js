const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the frontend origins configured in Kubernetes.
const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

console.log('[auth] Allowed frontend origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header can include internal health checks.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn('[auth] CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// Database connection
require('./util/conn');

// Routes
const healthCheckRoute = require('./routes/healthCheck.route');
const userRoute = require('./routes/user.route');

app.use('/health', healthCheckRoute);
app.use('/api', userRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[auth] Request error:', err.message);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
  });
});

app.listen(PORT, () => {
  console.log(`Authentication Service Started at port ${PORT}`);
});
