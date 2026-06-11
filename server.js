const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 15000,
  pingTimeout: 10000
});

// In-memory room storage
const rooms = new Map();

const BURN_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const RECONNECT_GRACE = 60 * 1000; // 60 seconds grace period for reconnect

// Chinese idioms for room naming
const IDIOMS = [
  '风花雪月', '高山流水', '天涯若邻', '一见如故', '心有灵犀',
  '萍水相逢', '推心置腹', '莫逆之交', '金兰之契', '惺惺相惜',
  '把酒言欢', '促膝长谈', '肝胆相照', '志同道合', '相见恨晚',
  '情投意合', '意气相投', '同气连枝', '患难与共', '风雨同舟',
  '星夜密语', '月下对酌', '灯下闲谈', '围炉夜话', '枕月而眠',
  '浮生半日', '偷得清闲', '忙里偷闲', '且听风吟', '岁月静好'
];

function generateRoomId() {
  const idiom = IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return idiom + code;
}

app.use(express.static(path.join(__dirname, 'public')));

// Create a new room
app.get('/api/create-room', (req, res) => {
  const roomId = generateRoomId();
  rooms.set(roomId, {
    id: roomId,
    users: [],
    messages: [],
    createdAt: Date.now(),
    firstMessageAt: null,
    burnTimer: null,
    burned: false
  });
  res.json({ roomId });
});

// Check room status
app.get('/api/room/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.json({ exists: false, burned: true });
  }
  if (room.burned) {
    return res.json({ exists: false, burned: true });
  }
  const activeUsers = room.users.filter(u => !u.disconnected);
  if (activeUsers.length >= 2) {
    return res.json({ exists: true, full: true });
  }
  res.json({
    exists: true,
    full: false,
    countdown: room.firstMessageAt
      ? Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt))
      : null
  });
});

// Serve the SPA for room URLs
app.get('/room/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Also handle the short URL redirect: /c/roomId
app.get('/c/:id', (req, res) => {
  const roomId = decodeURIComponent(req.params.id);
  const room = rooms.get(roomId);
  if (!room || room.burned) {
    return res.redirect('/');
  }
  res.redirect(`/room/${encodeURIComponent(roomId)}`);
});

function burnRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.burned) return;

  room.burned = true;
  room.messages = [];

  // Clear any pending disconnect timers
  room.users.forEach(u => {
    if (u.disconnectTimer) clearTimeout(u.disconnectTimer);
  });

  // Notify all users
  io.to(roomId).emit('room-burned');

  // Disconnect all sockets from room
  io.in(roomId).socketsLeave(roomId);

  // Clean up after a short delay
  setTimeout(() => {
    rooms.delete(roomId);
  }, 5000);
}

// Track userId -> socket mapping for reconnection
const userSockets = new Map(); // userId -> { roomId, nickname, socketId }

io.on('connection', (socket) => {
  let currentRoom = null;
  let nickname = null;
  let userId = null;

  socket.on('join-room', ({ roomId, name, reconnectUserId }) => {
    const room = rooms.get(roomId);
    if (!room || room.burned) {
      socket.emit('error-msg', { message: '房间已焚毁或不存在' });
      return;
    }

    // Check if this is a reconnection
    if (reconnectUserId) {
      const existingUser = room.users.find(u => u.userId === reconnectUserId);
      if (existingUser && existingUser.disconnected) {
        // Reconnection! Cancel the disconnect timer
        if (existingUser.disconnectTimer) {
          clearTimeout(existingUser.disconnectTimer);
          existingUser.disconnectTimer = null;
        }
        existingUser.disconnected = false;
        existingUser.socketId = socket.id;

        currentRoom = roomId;
        nickname = existingUser.name;
        userId = reconnectUserId;

        socket.join(roomId);

        // Notify others that user is back
        io.to(roomId).emit('user-reconnected', {
          name: nickname,
          userCount: room.users.filter(u => !u.disconnected).length
        });

        // Send message history for reconnecting user
        if (room.firstMessageAt) {
          const remaining = Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt));
          socket.emit('countdown-sync', { remaining });
        }

        // Store mapping
        userSockets.set(userId, { roomId, nickname, socketId: socket.id });

        return;
      }
    }

    // Count active (non-disconnected) users
    const activeUsers = room.users.filter(u => !u.disconnected);
    if (activeUsers.length >= 2) {
      socket.emit('error-msg', { message: '房间已满（最多2人）' });
      return;
    }

    // New user
    currentRoom = roomId;
    nickname = name || '匿名';
    userId = uuidv4();

    const userData = {
      userId,
      socketId: socket.id,
      name: nickname,
      disconnected: false,
      disconnectTimer: null
    };

    room.users.push(userData);
    socket.join(roomId);

    // Tell this user their userId for reconnection
    socket.emit('your-user-id', { userId });

    // Notify the room
    io.to(roomId).emit('user-joined', {
      name: nickname,
      userCount: room.users.filter(u => !u.disconnected).length
    });

    // Send current countdown if active
    if (room.firstMessageAt) {
      const remaining = Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt));
      socket.emit('countdown-sync', { remaining });
    }

    // Store mapping
    userSockets.set(userId, { roomId, nickname, socketId: socket.id });
  });

  socket.on('send-message', ({ text }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.burned) return;

    const msg = {
      id: uuidv4(),
      sender: nickname,
      senderId: userId,
      text,
      timestamp: Date.now()
    };
    room.messages.push(msg);

    // Start countdown on first message
    if (!room.firstMessageAt) {
      room.firstMessageAt = Date.now();
      room.burnTimer = setTimeout(() => burnRoom(currentRoom), BURN_TIMEOUT);
      io.to(currentRoom).emit('countdown-started', { duration: BURN_TIMEOUT });
    }

    io.to(currentRoom).emit('new-message', msg);
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !userId) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const userData = room.users.find(u => u.userId === userId);
    if (!userData) return;

    // Mark as disconnected but DON'T remove yet
    userData.disconnected = true;

    // Set a grace period timer
    userData.disconnectTimer = setTimeout(() => {
      // User didn't reconnect in time, actually remove them
      room.users = room.users.filter(u => u.userId !== userId);
      io.to(currentRoom).emit('user-left', {
        name: nickname,
        userCount: room.users.filter(u => !u.disconnected).length
      });
      userSockets.delete(userId);
    }, RECONNECT_GRACE);

    // Notify others that user is temporarily disconnected
    io.to(currentRoom).emit('user-disconnected', {
      name: nickname
    });

    userSockets.delete(userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Burn Chat running on port ${PORT}`);
});
