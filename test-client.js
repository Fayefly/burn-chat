const { io } = require("socket.io-client");

const ROOM_ID = "c23838f4";
const SERVER = "http://localhost:3000";

const socket = io(SERVER);

socket.on("connect", () => {
  console.log("connected");
  socket.emit("join-room", { roomId: ROOM_ID, name: "测试小号" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`user-joined: ${name}, count=${userCount}`);
  if (userCount >= 2) {
    setTimeout(() => {
      socket.emit("send-message", { text: "你好！我是模拟的对方" });
      console.log("sent msg 1");
    }, 1000);

    setTimeout(() => {
      socket.emit("send-message", { text: "能收到我的消息吗？" });
      console.log("sent msg 2");
    }, 3000);

    setTimeout(() => {
      socket.emit("send-message", { text: "30分钟后这些消息就会消失了" });
      console.log("sent msg 3");
    }, 5000);

    setTimeout(() => {
      console.log("test done");
      socket.disconnect();
      process.exit(0);
    }, 8000);
  }
});

socket.on("new-message", (msg) => {
  if (msg.senderId !== socket.id) {
    console.log(`received from you: "${msg.text}"`);
  }
});

socket.on("countdown-started", ({ duration }) => {
  console.log(`countdown started: ${duration / 1000}s`);
});

socket.on("error-msg", ({ message }) => {
  console.log("error:", message);
  process.exit(1);
});
