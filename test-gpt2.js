const { io } = require("socket.io-client");

const ROOM_ID = "萍水相逢YJmX";
const SERVER = "https://chatburn.up.railway.app";

const socket = io(SERVER, { transports: ["websocket", "polling"] });

const gptReplies = [
  "这是一个很好的问题！让我从多个角度来分析一下。首先，从用户体验的角度来看，当前的设计采用了类似主流 AI 对话产品的视觉语言，这能够让用户在第一时间产生熟悉感，降低认知负荷。其次，从技术实现的角度来说，WebSocket 的双向通信机制确保了消息的实时性，而 30 分钟自毁的机制则在服务器端通过内存 Map + setTimeout 实现，避免了数据库持久化带来的安全风险。综合来看，这种设计在安全性、实时性和用户体验之间取得了很好的平衡。希望这个回答对你有所帮助！如果你还有其他问题，欢迎继续提问。",
  "让我仔细思考一下这个问题。从产品设计层面来看，阅后即焚的核心价值在于「信息不留痕」，这与当前主流通讯工具的消息持久化策略形成了鲜明的对比。在技术架构上，我们采用了 Node.js + Socket.io 的组合，这是一个经过大量生产验证的技术栈。Express 作为 Web 框架提供了路由和静态资源服务，而 Socket.io 则负责实时双向通信。服务器端使用内存存储（JavaScript Map）来管理房间状态，这意味着：1) 服务器重启后所有数据自动清除；2) 没有磁盘 I/O 开销；3) 天然的隐私保护。这种架构虽然简单，但非常契合产品的核心需求。",
  "关于这个问题，我可以从以下几个维度进行详细分析：\n\n第一，UI/UX 设计方面：采用了暖白灰背景色（#F8F9FB）配合极浅的水印纹理，营造出类似主流 AI 产品的视觉感受。输入框使用了大面积白色卡片搭配紫色描边，既突出了输入区域的重要性，又保持了整体的简洁感。\n\n第二，消息展示方面：对方的消息采用了无气泡的文本流设计，配合绿色圆形头像，模仿了 ChatGPT 的回复样式。每条消息下方还有模拟的工具栏（复制、刷新、点赞、点踩）和评价胶囊按钮（糟糕/一般/优秀），虽然这些按钮目前没有实际功能，但增强了「AI 对话」的既视感。\n\n第三，安全性方面：30 分钟自动销毁机制确保了所有聊天记录不会长期留存，保护了用户的隐私安全。\n\n希望这个分析对你有帮助！如有更多疑问，请随时提问。",
  "非常感谢你的提问！这是一个非常有深度的话题。从软件工程的角度来看，这个项目的架构体现了「简单即优雅」的设计哲学。整个应用只用了不到 500 行代码就实现了一个完整的实时聊天系统，包括：房间管理、WebSocket 通信、自动销毁机制、断线重连、以及精心设计的用户界面。\n\n值得一提的是断线重连机制的实现：当用户的网络出现抖动时，服务器不会立即将用户踢出房间，而是给予 60 秒的宽限期。在这段时间内，如果用户重新连接并携带相同的 userId，服务器会恢复其会话状态。这种设计大大提升了移动网络环境下的用户体验。\n\n此外，房间命名使用了「成语 + 随机码」的方式（如「风花雪月A3f9」），既保证了唯一性，又增添了文化气息，比传统的随机字符串更加友好和有趣。\n\n希望这个回答能够解答你的疑惑！如果还有其他问题，我很乐意继续探讨。",
  "让我来详细解释一下这个功能的工作原理。当你创建一个新房间时，系统会在服务器内存中创建一个房间对象，包含房间 ID、用户列表、消息列表、创建时间、首条消息时间和销毁定时器等属性。房间 ID 由一个随机选取的四字成语加上四位随机字母数字组成。\n\n当第一个用户发送消息时，系统会启动一个 30 分钟的定时器（setTimeout），时间到达后自动执行销毁逻辑：清除所有消息、通知所有用户、断开 WebSocket 连接，最后在 5 秒后从内存中删除房间对象。\n\n在客户端，倒计时通过服务器同步机制保持精确：当用户重新连接或页面刷新时，服务器会发送剩余时间，客户端据此重新计算本地倒计时。这确保了即使出现网络延迟，倒计时也能保持准确。\n\n整体来看，这是一个设计精巧、实现优雅的小型实时应用。希望这个解释对你有帮助！"
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
    console.log(`recv from user: ${msg.text}`);
    // Auto reply with GPT-style verbose response
    setTimeout(() => {
      const reply = gptReplies[replyIndex % gptReplies.length];
      socket.emit("send-message", { text: reply });
      replyIndex++;
      console.log(`sent gpt reply #${replyIndex}`);
    }, 800);
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

// Send initial greeting
setTimeout(() => {
  socket.emit("send-message", { text: "你好！我是 GPT-5.4-mini，很高兴能和你进行这次对话测试。\n\n关于你提到的 UI 效果，我已经按照 ChatGPT 的视觉风格进行了全面的适配。你现在看到的消息应该是以绿色旋涡头像、无气泡文本流的形式展示的，下方还有模拟的工具栏按钮和评价胶囊。\n\n从技术角度来说，这些视觉元素都是纯前端渲染的，不涉及任何后端逻辑。工具栏的按钮目前只是装饰性的，点击后不会产生实际效果，但它们的存在能够增强「AI 对话」的视觉暗示，让使用者产生一种正在与 AI 助手交流的错觉。\n\n如果你有任何其他问题或需要进一步的调整，请随时告诉我！我会尽快回复你，并且每次回复都会附带一些详细的解释和分析。" });
  console.log("sent initial greeting");
}, 1000);
