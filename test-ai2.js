const { io } = require("socket.io-client");
const SERVER = "https://chatburn.up.railway.app";

async function main() {
  // Create room via HTTP API
  const res = await fetch(SERVER + "/api/create-room");
  const { roomId } = await res.json();
  console.log("Room:", roomId);

  const socket = io(SERVER, { transports: ["websocket", "polling"] });
  let gotAi = false;

  socket.on("connect", () => {
    console.log("Connected");
    socket.emit("join-room", { roomId, name: "测试员" });
  });

  socket.on("user-joined", () => {
    console.log("Joined room, sending message...");
    setTimeout(() => {
      socket.emit("send-message", { text: "你觉得人工智能怎么样？" });
    }, 500);
  });

  socket.on("new-message", (msg) => {
    console.log("Message:", msg.text.substring(0, 40));
  });

  socket.on("ai-supplement", ({ text }) => {
    console.log("AI Supplement received!", text.substring(0, 80));
    gotAi = true;
    setTimeout(() => { socket.disconnect(); process.exit(0); }, 500);
  });

  socket.on("error-msg", (err) => {
    console.log("Error:", err.message);
  });

  setTimeout(() => {
    console.log(gotAi ? "SUCCESS" : "FAIL - no AI supplement received in 25s");
    socket.disconnect();
    process.exit(gotAi ? 0 : 1);
  }, 25000);
}
main();
