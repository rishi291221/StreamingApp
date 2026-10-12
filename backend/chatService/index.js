const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { Server } = require('socket.io');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const PORT = process.env.PORT || 3004;

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

  console.error('Chat CORS rejected origin:', origin);
  return callback(new Error('Not allowed by CORS'));
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
});

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Database and authentication helpers
const { connectDB } = require('./db');
const { verifyToken, buildUserContext } = require('./util/auth');
const { ChatMessage } = require('./models/message.model');

connectDB();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'chat',
    status: 'ok',
  });
});

// Chat REST API
app.use('/api/chat', require('./routes/chat.route'));

// Authenticate Socket.IO connections
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
    socket.handshake.query?.token;

  const decoded = verifyToken(token);

  if (!decoded) {
    return next(new Error('Unauthorized'));
  }

  socket.user = buildUserContext(decoded);
  socket.data.joinedRooms = new Set();

  return next();
});

io.on('connection', (socket) => {
  console.log('Chat user connected:', socket.user?.email);

  socket.on('chat:join', async ({ videoId } = {}, ack) => {
    try {
      if (!videoId) {
        if (ack) {
          ack({
            success: false,
            message: 'videoId is required',
          });
        }
        return;
      }

      const room = `video:${videoId}`;

      socket.join(room);
      socket.data.joinedRooms.add(videoId);

      const messages = await ChatMessage.find({ videoId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const payload = {
        success: true,
        messages: messages.reverse(),
      };

      socket.emit('chat:history', payload.messages);

      if (ack) {
        ack(payload);
      }
    } catch (error) {
      console.error('Error joining chat room:', error);

      if (ack) {
        ack({
          success: false,
          message: 'Failed to load chat history',
        });
      }
    }
  });

  socket.on('chat:leave', ({ videoId } = {}) => {
    if (!videoId) {
      return;
    }

    socket.leave(`video:${videoId}`);
    socket.data.joinedRooms.delete(videoId);
  });

  socket.on('chat:message', async ({ videoId, content } = {}, ack) => {
    try {
      if (!videoId || typeof content !== 'string') {
        if (ack) {
          ack({
            success: false,
            message: 'videoId and content are required',
          });
        }
        return;
      }

      if (!socket.data.joinedRooms.has(videoId)) {
        if (ack) {
          ack({
            success: false,
            message: 'You must join the room before sending messages',
          });
        }
        return;
      }

      const messageText = content.trim();

      if (!messageText) {
        if (ack) {
          ack({
            success: false,
            message: 'Message cannot be empty',
          });
        }
        return;
      }

      if (messageText.length > 1000) {
        if (ack) {
          ack({
            success: false,
            message: 'Message is too long',
          });
        }
        return;
      }

      const message = await ChatMessage.create({
        videoId,
        userId: socket.user.id,
        userName: socket.user.name,
        role: socket.user.role,
        content: messageText,
      });

      const payload = {
        id: message._id.toString(),
        videoId: message.videoId,
        userId: message.userId,
        userName: message.userName,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      };

      io.to(`video:${videoId}`).emit('chat:message', payload);

      if (ack) {
        ack({
          success: true,
          message: payload,
        });
      }
    } catch (error) {
      console.error('Error broadcasting chat message:', error);

      if (ack) {
        ack({
          success: false,
          message: 'Failed to send message',
        });
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(
      'Chat user disconnected:',
      socket.user?.email,
      reason
    );

    socket.data.joinedRooms.clear();
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Chat service error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

server.listen(PORT, () => {
  console.log(`Chat service listening on port ${PORT}`);
  console.log('Allowed frontend origins:', allowedOrigins);
});
