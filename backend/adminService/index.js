const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// TEMPORARY: Allow all origins while testing Kubernetes deployment
app.use(cors({
  origin: true,
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
app.use('/api/auth', userRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

app.listen(PORT, () => {
  console.log(`Authentication Service Started at port ${PORT}`);
});
