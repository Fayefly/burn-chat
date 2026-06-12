const { io } = require("socket.io-client");
const SERVER = "https://chatburn.up.railway.app";
const ROOM_ID = "志同道合gWpD";

const socket = io(SERVER, {
  transports: ["polling", "websocket"],
  timeout: 20000,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10
});

socket.on("connect", () => {
  console.log("✓ Connected");
  socket.emit("join-room", { roomId: ROOM_ID, name: "QoderWork" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`👋 ${name} 在房间里 (${userCount} 人在线)`);
});

socket.on("user-left", ({ name, userCount }) => {
  console.log(`👋 ${name} 离开了 (${userCount} 人在线)`);
});

socket.on("new-message", (msg) => {
  console.log(`💬 [${msg.sender}]: ${msg.text}${msg.image ? ' 📷' : ''}`);
});

socket.on("ai-supplement", ({ text }) => {
  console.log(`🤖 AI补充: ${text}`);
});

socket.on("user-disconnected", ({ name }) => {
  console.log(`⚡ ${name} 断线`);
});

socket.on("user-reconnected", ({ name }) => {
  console.log(`✓ ${name} 重连`);
});

socket.on("error-msg", ({ message }) => {
  console.log("❌ Error:", message);
});

socket.on("connect_error", (err) => {
  console.log("⚠️ 连接错误:", err.message);
});

// Send a greeting
setTimeout(() => {
  socket.emit("send-message", { text: "我来了！随时可以开始测试 🎉" });
}, 2000);

// Stay alive
process.on('SIGINT', () => { socket.disconnect(); process.exit(0); });
