const { io } = require("socket.io-client");

const ROOM_ID = "77048ef0";
const SERVER = "https://chatburn.up.railway.app";

const socket = io(SERVER, { transports: ["websocket", "polling"] });

socket.on("connect", () => {
  console.log("WS connected");
  socket.emit("join-room", { roomId: ROOM_ID, name: "TestBot" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`user-joined: ${name} (count=${userCount})`);
  if (userCount >= 1) {
    setTimeout(() => {
      socket.emit("send-message", { text: "Railway WebSocket 测试成功！" });
      console.log("message sent");
    }, 500);
    setTimeout(() => {
      socket.disconnect();
      console.log("test passed!");
      process.exit(0);
    }, 2000);
  }
});

socket.on("new-message", (msg) => {
  if (msg.senderId !== socket.id) {
    console.log(`recv: ${msg.text}`);
  }
});

socket.on("error-msg", ({ message }) => {
  console.log("error:", message);
  process.exit(1);
});

setTimeout(() => {
  console.log("timeout");
  process.exit(1);
}, 10000);
