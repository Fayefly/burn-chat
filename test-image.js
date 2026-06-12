const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", async () => {
  console.log("✓ Connected");
  
  // Create room via API
  const res = await fetch("http://localhost:3000/api/create-room");
  const { roomId } = await res.json();
  console.log("✓ Room created:", roomId);
  
  // Join room
  socket.emit("join-room", { roomId, name: "测试员" });
  
  setTimeout(() => {
    // Send message with image (tiny 1x1 PNG)
    const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    socket.emit("send-message", { 
      text: "这是一条带图片的消息",
      image: { data: tinyPngBase64, mime: "image/png" }
    });
    console.log("✓ Sent message with image");
  }, 500);
});

socket.on("new-message", (msg) => {
  console.log("✓ Received message:", msg.text);
  console.log("  Has image:", !!msg.image);
  if (msg.image) {
    console.log("  Image mime:", msg.image.mime);
    console.log("  Image data length:", msg.image.data?.length);
  }
});

socket.on("ai-supplement", ({ text }) => {
  console.log("✓ AI Supplement:", text.substring(0, 80) + "...");
});

setTimeout(() => {
  console.log("\n=== Test completed ===");
  socket.disconnect();
  process.exit(0);
}, 8000);
