const { io } = require("socket.io-client");

const ROOM_ID = "1521c466";
const SERVER = "http://localhost:3000";

const socket = io(SERVER);

socket.on("connect", () => {
  console.log("✅ 已连接，正在加入房间...");
  socket.emit("join-room", { roomId: ROOM_ID, name: "QoderWork" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`👤 ${name} 在房间里 (共${userCount}人)`);
});

socket.on("new-message", (msg) => {
  if (msg.senderId !== socket.id) {
    console.log(`📩 ${msg.sender}: ${msg.text}`);
  }
});

socket.on("countdown-started", ({ duration }) => {
  console.log(`⏱ 倒计时开始: ${Math.floor(duration/60000)}分钟`);
});

socket.on("countdown-sync", ({ remaining }) => {
  console.log(`⏱ 剩余: ${Math.floor(remaining/60000)}分${Math.floor((remaining%60000)/1000)}秒`);
});

socket.on("room-burned", () => {
  console.log("🔥 房间已焚毁！");
  socket.disconnect();
  process.exit(0);
});

socket.on("error-msg", ({ message }) => {
  console.log("❌ 错误:", message);
  process.exit(1);
});

// Keep alive and allow manual message sending
console.log("🟢 已加入房间，等待消息...");

// Auto-send greeting after joining
setTimeout(() => {
  socket.emit("send-message", { text: "你好！我是 QoderWork，来测试聊天功能的 🤖" });
  console.log("📤 发送了第一条消息");
}, 1000);
