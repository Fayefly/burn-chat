const { io } = require("socket.io-client");

const ROOM_ID = "萍水相逢QFE9";
const SERVER = "http://localhost:3000";

const socket = io(SERVER, { transports: ["websocket", "polling"] });

const gptReplies = [
  "这是一个非常好的问题！让我从多个维度来为您详细分析。\n\n首先，从技术架构的角度来看，当前的实现采用了 Node.js + Express + Socket.io 的经典组合。这种架构的优势在于：\n\n1. **实时性**：WebSocket 协议提供了全双工通信，消息可以即时推送\n2. **可扩展性**：事件驱动的架构天然支持高并发场景\n3. **开发效率**：丰富的生态系统和社区支持\n\n其次，从用户体验的角度，30分钟自毁的设计巧妙地平衡了「即时通讯」和「隐私保护」两个看似矛盾的需求。\n\n如果您还有其他疑问，我很乐意进一步探讨！",
  "感谢您的提问。关于这个话题，我想分享一些深入的见解。\n\n从软件工程的最佳实践来看，这个设计体现了几个重要的设计原则：\n\n**单一职责原则**：每个组件只负责一个明确定义的功能\n**开闭原则**：系统对扩展开放，对修改关闭\n**依赖倒置**：高层模块不依赖低层模块的具体实现\n\n在实际应用中，这种架构可以支持：\n- 水平扩展（通过 Redis Pub/Sub 实现跨服务器消息广播）\n- 消息持久化（可选地接入 MongoDB 或 PostgreSQL）\n- 端到端加密（通过 Signal Protocol 或类似方案）\n\n希望这个分析对您有所帮助。如需进一步讨论，请随时告知！",
  "让我为您详细解答这个问题。\n\n从产品设计的角度来看，「阅后即焚」这个概念最早由 Snapchat 提出，后来被 Signal、Telegram 等众多产品采纳。其核心价值主张包括：\n\n1. **隐私保护**：用户不必担心聊天记录被永久存储\n2. **减少焦虑**：降低「数字足迹」带来的心理负担\n3. **促进真实表达**：用户更愿意分享真实的想法和感受\n\n从技术实现的角度，目前主要有以下几种方案：\n\n| 方案 | 优点 | 缺点 |\n|------|------|------|\n| 内存存储 | 简单高效 | 重启即丢失 |\n| 定时删除 | 可控性强 | 需要持久化层 |\n| 端到端加密 | 最高安全 | 实现复杂 |\n\n当前实现采用了内存存储 + 定时销毁的方案，在简单性和功能性之间取得了良好的平衡。\n\n如果您对这个话题有更多兴趣，我很乐意继续深入探讨！",
  "这是一个值得深入探讨的话题。让我从历史和现状两个角度来分析。\n\n**历史回顾**\n\n实时聊天系统的发展可以追溯到 1970 年代的 Talkomatic 系统。此后经历了几个重要阶段：\n- 1990s: ICQ、MSN Messenger 等桌面客户端\n- 2000s: Web 2.0 时代的 AJAX 长轮询方案\n- 2010s: WebSocket 标准化和 Socket.io 等库的兴起\n- 2020s: WebRTC、Server-Sent Events 等新标准的普及\n\n**当前技术选型**\n\nSocket.io 之所以成为最受欢迎的实时通信库之一，主要归功于：\n\n1. 自动降级机制（WebSocket -> HTTP Long Polling）\n2. 房间（Rooms）和命名空间（Namespaces）的原生支持\n3. 断线自动重连\n4. 二进制数据支持\n5. 多路复用\n\n在您的项目中，这些特性都得到了充分利用，特别是房间功能和断线重连机制，为良好的用户体验奠定了基础。\n\n希望这个回答对您有所启发！如果您有任何后续问题，我很乐意继续交流。"
];

let replyIndex = 0;

socket.on("connect", () => {
  console.log("connected");
  socket.emit("join-room", { roomId: ROOM_ID, name: "GPT-5.4-mini" });
});

socket.on("user-joined", ({ name, userCount }) => {
  console.log(`user-joined: ${name} (count=${userCount})`);
});

socket.on("new-message", (msg) => {
  if (msg.senderId !== socket.id) {
    console.log(`recv: ${msg.sender}: ${msg.text}`);
    setTimeout(() => {
      const reply = gptReplies[replyIndex % gptReplies.length];
      socket.emit("send-message", { text: reply });
      replyIndex++;
      console.log(`sent reply #${replyIndex}`);
    }, 1500);
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
  socket.emit("send-message", { text: "你好！我是 GPT-5.4-mini。\n\n这是一个很好的开场白！让我来介绍一下这个聊天系统的特点：\n\n**阅后即焚**：所有消息会在 30 分钟后自动销毁，保护您的隐私\n**实时通信**：基于 WebSocket 技术，消息即时送达\n**简洁优雅**：界面设计参考了主流 AI 对话产品的视觉语言\n\n请随时向我提问，我会用详尽的 GPT 风格回复您！" });
  console.log("sent greeting");
}, 1000);
