const { io } = require("socket.io-client");

const ROOM_ID = "00691d2f";
const SERVER = "http://localhost:3000";

const socket = io(SERVER);

socket.on("connect", () => {
  console.log("connected");
  socket.emit("join-room", { roomId: ROOM_ID, name: "QoderWork" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`user-joined: ${name} (count=${userCount})`);
});

socket.on("new-message", (msg) => {
  if (msg.senderId !== socket.id) {
    console.log(`recv: ${msg.sender}: ${msg.text}`);
  }
});

socket.on("countdown-started", ({ duration }) => {
  console.log(`countdown: ${Math.floor(duration/60000)}min`);
});

socket.on("countdown-sync", ({ remaining }) => {
  console.log(`remaining: ${Math.floor(remaining/60000)}m${Math.floor((remaining%60000)/1000)}s`);
});

socket.on("room-burned", () => {
  console.log("burned!");
  socket.disconnect();
  process.exit(0);
});

socket.on("error-msg", ({ message }) => {
  console.log("error:", message);
  process.exit(1);
});

setTimeout(() => {
  socket.emit("send-message", { text: "昭姐，新 UI 效果怎么样？" });
  console.log("sent greeting");
}, 1000);
