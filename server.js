const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory room storage
const rooms = new Map();

const BURN_TIMEOUT = 30 * 60 * 1000; // 30 minutes

app.use(express.static(path.join(__dirname, 'public')));

// Create a new room
app.get('/api/create-room', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
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
  const userCount = room.users.length;
  if (userCount >= 2) {
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

function burnRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.burned) return;

  room.burned = true;
  room.messages = [];

  // Notify all users
  io.to(roomId).emit('room-burned');

  // Disconnect all sockets from room
  io.in(roomId).socketsLeave(roomId);

  // Clean up after a short delay
  setTimeout(() => {
    rooms.delete(roomId);
  }, 5000);
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let nickname = null;

  socket.on('join-room', ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (!room || room.burned) {
      socket.emit('error-msg', { message: '房间已焚毁或不存在' });
      return;
    }
    if (room.users.length >= 2) {
      socket.emit('error-msg', { message: '房间已满（最多2人）' });
      return;
    }

    currentRoom = roomId;
    nickname = name || '匿名';
    room.users.push({ id: socket.id, name: nickname });
    socket.join(roomId);

    // Notify the room
    io.to(roomId).emit('user-joined', {
      name: nickname,
      userCount: room.users.length
    });

    // Send current countdown if active
    if (room.firstMessageAt) {
      const remaining = Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt));
      socket.emit('countdown-sync', { remaining });
    }
  });

  socket.on('send-message', ({ text }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.burned) return;

    const msg = {
      id: uuidv4(),
      sender: nickname,
      senderId: socket.id,
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
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.users = room.users.filter(u => u.id !== socket.id);
    io.to(currentRoom).emit('user-left', {
      name: nickname,
      userCount: room.users.length
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Burn Chat running on port ${PORT}`);
});
