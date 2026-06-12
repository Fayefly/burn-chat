const { io } = require("socket.io-client");
const SERVER = "https://chatburn.up.railway.app";
const socket = io(SERVER, { transports: ["websocket", "polling"] });

let gotAiSupplement = false;

socket.on("connect", () => {
  console.log("✓ Connected");
  socket.emit("create-room", { name: "测试用户" });
});

socket.on("room-created", ({ roomId }) => {
  console.log("✓ Room created:", roomId);
  setTimeout(() => {
    socket.emit("send-message", { text: "你好，测试一下AI回复功能" });
  }, 500);
});

socket.on("new-message", (msg) => {
  console.log("✓ Message:", msg.text.substring(0, 30) + "...");
});

socket.on("ai-supplement", ({ text }) => {
  console.log("✓ AI Supplement:", text.substring(0, 80) + "...");
  gotAiSupplement = true;
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 500);
});

socket.on("error-msg", (err) => {
  console.log("✗ Error:", err.message);
});

setTimeout(() => {
  if (!gotAiSupplement) {
    console.log("⏳ Timeout - AI supplement not received");
  }
  socket.disconnect();
  process.exit(gotAiSupplement ? 0 : 1);
}, 20000);
