const { io } = require("socket.io-client");

const ROOM_ID = "萍水相逢YJmX";
const SERVER = "https://chatburn.up.railway.app";

const socket = io(SERVER, { transports: ["websocket", "polling"] });

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
  socket.emit("send-message", { text: "昭姐，ChatGPT 风格 UI 测试！这条消息应该显示为带绿色头像的 AI 消息格式 🤖" });
  console.log("sent msg 1");
}, 1000);

setTimeout(() => {
  socket.emit("send-message", { text: "你看看左边的工具栏按钮和评价胶囊效果怎么样？" });
  console.log("sent msg 2");
}, 3000);
