const { io } = require("socket.io-client");

const ROOM_ID = process.argv[2];
const SERVER = "https://chatburn.up.railway.app";

console.log("Connecting to room:", ROOM_ID);

const socket = io(SERVER, {
  transports: ["polling", "websocket"],
  timeout: 20000,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 5
});

let gotAi = false;

socket.on("connect", () => {
  console.log("✓ Connected via", socket.io.engine.transport.name);
  socket.emit("join-room", { roomId: ROOM_ID, name: "AI测试员" });
});

socket.on("connect_error", (err) => {
  console.log("✗ Connection error:", err.message);
});

socket.on("user-joined", (data) => {
  console.log("✓ Joined room, users:", data.userCount);
  setTimeout(() => {
    console.log("Sending test message...");
    socket.emit("send-message", { text: "你好，请介绍一下量子计算的基本原理" });
  }, 1000);
});

socket.on("new-message", (msg) => {
  console.log("📩 Message from", msg.sender + ":", msg.text.substring(0, 50));
});

socket.on("ai-supplement", ({ text }) => {
  console.log("🤖 AI Supplement:", text.substring(0, 100) + "...");
  gotAi = true;
  setTimeout(() => { socket.disconnect(); process.exit(0); }, 500);
});

socket.on("error-msg", (err) => {
  console.log("❌ Error:", err.message);
});

setTimeout(() => {
  console.log(gotAi ? "\n✅ SUCCESS - AI supplement working!" : "\n❌ FAIL - No AI supplement received in 30s");
  console.log("Possible causes: OPENROUTER_API_KEY not set on Railway, or API error");
  socket.disconnect();
  process.exit(gotAi ? 0 : 1);
}, 30000);
