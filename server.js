const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 15000,
  pingTimeout: 10000,
  maxHttpBufferSize: 5e6  // 5MB for image uploads
});

// In-memory room storage
const rooms = new Map();

const BURN_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const RECONNECT_GRACE = 60 * 1000; // 60 seconds grace period for reconnect

// AI Supplement via DeepSeek
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const AI_MODEL = 'deepseek-chat';

// Pre-written supplement pool (random, no relation to message needed)
const SUPPLEMENT_POOL = [
  `说到这个，其实背后有个挺有意思的现象。很多人可能没注意到，我们在日常交流中使用的语言模式，其实在潜移默化地影响着我们的思维方式。
• 语言学家萨丕尔-沃尔夫假说认为，语言结构决定了思维模式。比如中文里的"随便"，在其他语言里很难找到完全对应的表达。
• 神经科学研究发现，双语者在切换语言时，大脑的前额叶皮层活跃度会显著增加，这说明语言切换其实是一种认知训练。
• 更有趣的是，人在使用不同语言时，道德判断也会出现差异。用非母语做决策时，人倾向于更理性的选择。
• 所以下次聊天的时候，不妨想想：是我们选择了语言，还是语言塑造了我们？`,

  `这个话题让我想到一个冷知识——人类大脑处理信息的速度其实远没有我们以为的那么快。
• 视觉信息从眼睛到大脑视觉皮层只需要大约13毫秒，但理解这些信息却需要几百毫秒。
• 我们的意识其实是大脑处理信息后大约500毫秒才"上线"的，这意味着你觉得自己"立刻"做出的反应，其实大脑早就替你做好了决定。
• 有个经典实验表明，科学家可以通过脑电波在你意识到之前7秒就预测出你要按哪个按钮。
• 这引出一个哲学问题：自由意志到底存不存在？还是说我们只是大脑自动化程序的旁观者？`,

  `你知道吗，现在全球每天产生约2.5万亿字节的数据，相当于人类有文字记载以来到2003年所有数据总和的几百倍。
• 但这些数据中90%是非结构化的——图片、视频、语音、社交媒体帖子，传统的数据库根本处理不了。
• 有意思的是，大数据这个词最早其实是1997年NASA的科学家提出的，因为他们发现当时的工具已经无法处理他们收集的数据了。
• 到今天，数据已经成了比石油还值钱的资源。全球最有价值的公司几乎都是以数据为核心的科技企业。
• 不过话说回来，数据再多，如果不会从中提取有价值的信息，也就是一堆数字垃圾。`,

  `聊到这个，突然想到一个心理学效应叫"邓巴数"——人类能维持的稳定社交关系上限大约是150人。
• 这个数字不是随便说的。人类学家罗宾·邓巴通过研究灵长类动物的大脑新皮层大小推算出来的，后来在各种社会组织中得到了验证。
• 古罗马军团的一个基本作战单位就是150人左右，中世纪欧洲村庄的平均规模也差不多是这个数。
• 在社交媒体时代，你可能有几千个"好友"，但真正能叫出名字、了解近况的，大概也就150人左右。
• 更细分的话，亲密圈大约5人，好友圈15人，朋友圈50人，然后是150人的活跃社交圈。每层关系的情感投入都在递减。`,

  `说起这个，不得不提一个反直觉的事实：失败其实比成功更有信息量。
• 统计学上有个概念叫"幸存者偏差"。二战时期，军方想加固飞机，就去研究返航飞机上的弹孔分布。结果统计学家沃德指出：应该加固没有弹孔的位置，因为被打中那些部位的飞机根本没能返航。
• 创业领域也是类似——我们总看成功企业的经验，但可能恰恰是那些失败企业踩过的坑才更有参考价值。
• 心理学研究表明，从失败中学到的东西往往比从成功中多。因为成功容易让人归因于自己的能力，而失败则迫使人们反思。
• 所以下次遇到失败，不妨庆祝一下——你刚刚获得了一份高信息量的反馈。`,

  `其实这个话题可以引申到一个很有意思的领域——博弈论。
• 经典的"囚徒困境"告诉我们：两个理性的人，即使合作对双方都更好，也可能因为缺乏信任而选择互相背叛。
• 但政治学家罗伯特·阿克塞尔罗德做了一个著名的计算机锦标赛，发现最有效的策略竟然是最简单的"以牙还牙"——先合作，然后模仿对方上一步的选择。
• 更有趣的是，在重复博弈中加入"宽容"因子后，效果会更好。即使对方背叛了一次，你也不妨再给一次合作机会。
• 这某种程度上证明了：善良、宽容、不嫉妒、不耍滑头——这些品质不仅是道德上的美德，也是数学上的最优策略。`,

  `说到这个，推荐一个概念叫"费曼学习法"，据说是诺贝尔物理学奖得主理查德·费曼的学习秘诀。
• 核心思想极其简单：如果你不能用简单的话把一个概念解释清楚，说明你并没有真正理解它。
• 具体步骤是：选一个概念→尝试教给一个小孩→发现卡壳的地方→回去重新学习那部分→简化后再教一遍。
• 费曼本人就是个中高手。他能把量子电动力学这种极其抽象的理论，用几乎任何人都能理解的方式讲出来。
• 这个方法之所以有效，是因为"教"的过程会强迫大脑对信息进行深度加工，而不只是浅层的记忆和复述。`,

  `聊到这里，分享一个关于睡眠的有趣发现。
• 大多数人以为睡觉是大脑在"休息"，但其实睡眠期间大脑的活跃程度并不比清醒时低多少。大脑在做的事情是：整理白天获得的信息，把短期记忆转化为长期记忆。
• 哈佛大学的研究发现，如果在学习新技能后立刻睡觉，第二天表现会显著提升，仿佛大脑在睡眠中"偷偷练习"了一整晚。
• 更神奇的是"清醒梦"——有些人可以在梦中意识到自己在做梦，然后主动控制梦境。大约55%的人一生中至少体验过一次。
• 所以别小看睡觉这件事。好好睡一觉，可能比多学两小时更有用。`,

  `这个话题让我想到一个关于人类认知的有趣偏差——"达克效应"。
• 简单来说就是：能力不足的人往往会高估自己的能力，而能力很强的人反而倾向于低估自己。
• 这并不是因为聪明人谦虚，而是因为真正懂行的人清楚知道这个领域有多深、自己不懂的有多少。
• 心理学家邓宁和克鲁格在1999年的实验中发现，表现最差的那组人平均认为自己在第62百分位，而实际只有第12百分位。
• 这个效应在日常生活中随处可见——刚学了点皮毛就觉得自己什么都懂了，反而是越学越觉得自己无知。苏格拉底早就说过："我唯一知道的就是我一无所知。"`,

  `你知道吗，全世界大约有7000种语言，但每两周就有一种语言消亡。语言多样性正在以前所未有的速度减少。
• 最让人惋惜的是，很多语言里蕴含着独特的世界观和知识体系。比如澳大利亚原住民的语言中，没有"左""右"这种相对方向词，而是用东南西北来描述一切位置。
• 冰岛的语言保存得特别好，现代冰岛人能轻松阅读1000年前的古冰岛语文献，这在世界上几乎是独一无二的。
• 有趣的是，emoji 被一些人称为"第一种全球通用语言"。虽然它没有语法，但在某些场景下确实跨越了语言障碍。
• 保护语言多样性不仅是文化问题，也是科学问题——每种语言都代表了一种独特的人类认知方式。`,

  `说到这个，我想分享一个关于"注意力经济"的观察。
• 在互联网时代，信息不再稀缺，真正稀缺的是注意力。诺贝尔奖得主赫伯特·西蒙在1971年就预言了这一点："信息的丰富意味着注意力的贫乏。"
• 现代科技公司本质上都在做同一件事：争夺你的注意力。Netflix 的 CEO 说过："我们最大的竞争对手不是 HBO，而是睡眠。"
• 一个普通成年人每天大约会看手机 96 次，平均每隔 10 分钟就看一次。而每次被打断后，需要大约 23 分钟才能重新集中注意力。
• 所以"深度工作"能力——能够长时间专注于一项复杂任务的能力——在21世纪变得越来越稀缺和珍贵。能够掌控自己注意力的人，才是真正的赢家。`,

  `聊到这里，突然想到一个反常识的事实：人类其实一直在"进化"，而且进化的速度可能比过去更快。
• 过去一万年来，乳糖耐受性的进化就是一个很好的例子。在畜牧业发展之前，成年人类几乎都不能消化牛奶。但现在大约35%的成年人具有乳糖耐受性。
• 另一个有趣的例子是藏族人对高原缺氧环境的适应。他们体内有一个来自已灭绝古人类丹尼索瓦人的基因变体，帮助他们在低氧环境中生存。
• 而且现代医学和科技也在改变人类的进化方向——近视在现代社会的高发率说明环境对生理特征的影响可能比我们想象的大得多。
• 人类从来不是进化的终点，我们仍然在变化的路上。`,

  `说起这个，推荐了解一下"邓宁-克鲁格效应"的反面——"冒名顶替综合征"。
• 研究表明，大约70%的人在一生中至少经历过一次"觉得自己不配拥有现在的成就，害怕被别人发现自己是个骗子"的感觉。
• 爱因斯坦晚年就曾说过类似的话："人们对我的工作的过度重视让我感到不安，我忍不住觉得自己是个不自觉的骗子。"
• 有意思的是，越是优秀的人越容易产生这种感觉，因为他们对自己的要求更高，也更清楚自己知识的边界。
• 下次如果你也有这种感觉，记住：它不是弱点，恰恰可能是你能力出众的信号。真正的"冒充者"通常不会担心自己是冒充者。`,

  `这个话题让我想到一个关于时间的有趣视角。
• 如果把地球46亿年的历史压缩成24小时，人类出现的时间大约是晚上11点58分37秒。也就是说，整个人类文明只占了地球历史最后不到90秒。
• 在这个时间尺度上，恐龙统治了地球将近"40分钟"——远比人类的"1.5秒"长得多。
• 而现代互联网（从1990年代算起）只存在了大约0.002秒。在这不到0.002秒里，人类产生的信息量超过了之前所有历史的总和。
• 这种时间压缩的视角可以帮助我们重新理解什么是"永恒"，什么是"转瞬即逝"。我们现在觉得天大的事情，放在宇宙尺度上，连一闪都算不上。`,

  `说到聊天这件事本身，其实人类的对话能力是进化中一个非常独特的产物。
• 其他灵长类动物也能通过叫声传递信息，但人类的语言有两个关键突破：一是"递归"能力，可以在句子中无限嵌套句子；二是"心理理论"，能够推测对方知道什么、不知道什么。
• 一个有趣的发现是，人类在对话中会自动"同步"——呼吸节奏、眨眼频率、甚至脑电波都会趋于一致。这种同步性和对话质量正相关。
• 研究表明，人类平均每天说大约16000个词。但女性平均比男性多说约2000个词。当然这只是统计平均值，个体差异很大。
• 所以下次和朋友聊天时，你们的脑电波可能正在不知不觉中"共舞"。`,

  `聊到这个，不得不提一个让科学家头疼的现象——" reproducibility crisis"（可重复性危机）。
• 2015年，一项大规模研究发现，发表在顶级心理学期刊上的100项经典研究中，只有36%能够被成功重复。这意味着超过六成的研究结论可能不靠谱。
• 原因包括：样本量太小、P值操纵（p-hacking）、发表偏差（只发表正面结果）、以及学术界的"不发表就灭亡"压力。
• 不过好消息是，科学界正在积极改进：预注册制度、开放数据、大型多中心研究等方法正在被越来越多地采用。
• 这也提醒我们，对任何单一研究结论都不要过度迷信。科学的真正力量不在于某一项研究，而在于长期积累和反复验证的过程。`,

  `说到这个，分享一个关于"选择困难"的科学解释。
• 心理学家巴里·施瓦茨提出了"选择的悖论"：选项越多，人们反而越难做出决定，做出决定后也越不满意。
• 经典实验是"果酱实验"——超市里摆24种果酱时，停下来看的人更多，但购买率只有3%；而只摆6种时，购买率反而高达30%。
• 这背后的心理机制是"机会成本焦虑"——每多选一个，就意味着放弃了其他所有选项，选项越多，放弃的感觉就越痛苦。
• 在现代社会，从点外卖到选职业，我们面临的选择数量远超人类进化的设计容量。有时候，给自己设一个"够好"的标准然后果断选择，比追求"最优"要快乐得多。`
];

function getRandomSupplement() {
  return SUPPLEMENT_POOL[Math.floor(Math.random() * SUPPLEMENT_POOL.length)];
}

// Chinese idioms for room naming
const IDIOMS = [
  '风花雪月', '高山流水', '天涯若邻', '一见如故', '心有灵犀',
  '萍水相逢', '推心置腹', '莫逆之交', '金兰之契', '惺惺相惜',
  '把酒言欢', '促膝长谈', '肝胆相照', '志同道合', '相见恨晚',
  '情投意合', '意气相投', '同气连枝', '患难与共', '风雨同舟',
  '星夜密语', '月下对酌', '灯下闲谈', '围炉夜话', '枕月而眠',
  '浮生半日', '偷得清闲', '忙里偷闲', '且听风吟', '岁月静好'
];

function generateRoomId() {
  const idiom = IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return idiom + code;
}

app.use(express.static(path.join(__dirname, 'public')));

// Create a new room
app.get('/api/create-room', (req, res) => {
  const roomId = generateRoomId();
  rooms.set(roomId, {
    id: roomId,
    users: [],
    messages: [],
    createdAt: Date.now(),
    firstMessageAt: null,
    burnTimer: null,
    burned: false
  });
  res.json({ roomId });
});

// Health check - shows if AI is configured
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ai_enabled: !!DEEPSEEK_API_KEY,
    ai_model: AI_MODEL
  });
});

// Debug: test AI connection
app.get('/api/test-ai', (req, res) => {
  const result = getRandomSupplement();
  res.json({ success: true, result: result.substring(0, 100) + '...' });
});

// Check room status
app.get('/api/room/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.json({ exists: false, burned: true });
  }
  if (room.burned) {
    return res.json({ exists: false, burned: true });
  }
  const activeUsers = room.users.filter(u => !u.disconnected);
  if (activeUsers.length >= 2) {
    return res.json({ exists: true, full: true });
  }
  res.json({
    exists: true,
    full: false,
    countdown: room.firstMessageAt
      ? Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt))
      : null
  });
});

// Serve the SPA for room URLs
app.get('/room/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Also handle the short URL redirect: /c/roomId
app.get('/c/:id', (req, res) => {
  const roomId = decodeURIComponent(req.params.id);
  const room = rooms.get(roomId);
  if (!room || room.burned) {
    return res.redirect('/');
  }
  res.redirect(`/room/${encodeURIComponent(roomId)}`);
});

function burnRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.burned) return;

  room.burned = true;
  room.messages = [];

  // Clear any pending disconnect timers
  room.users.forEach(u => {
    if (u.disconnectTimer) clearTimeout(u.disconnectTimer);
  });

  // Notify all users
  io.to(roomId).emit('room-burned');

  // Disconnect all sockets from room
  io.in(roomId).socketsLeave(roomId);

  // Clean up after a short delay
  setTimeout(() => {
    rooms.delete(roomId);
  }, 5000);
}

// Track userId -> socket mapping for reconnection
const userSockets = new Map(); // userId -> { roomId, nickname, socketId }

io.on('connection', (socket) => {
  let currentRoom = null;
  let nickname = null;
  let userId = null;

  socket.on('join-room', ({ roomId, name, reconnectUserId }) => {
    const room = rooms.get(roomId);
    if (!room || room.burned) {
      socket.emit('error-msg', { message: '房间已焚毁或不存在' });
      return;
    }

    // Check if this is a reconnection
    if (reconnectUserId) {
      const existingUser = room.users.find(u => u.userId === reconnectUserId);
      if (existingUser && existingUser.disconnected) {
        // Reconnection! Cancel the disconnect timer
        if (existingUser.disconnectTimer) {
          clearTimeout(existingUser.disconnectTimer);
          existingUser.disconnectTimer = null;
        }
        existingUser.disconnected = false;
        existingUser.socketId = socket.id;

        currentRoom = roomId;
        nickname = existingUser.name;
        userId = reconnectUserId;

        socket.join(roomId);

        // Notify others that user is back
        io.to(roomId).emit('user-reconnected', {
          name: nickname,
          userCount: room.users.filter(u => !u.disconnected).length
        });

        // Send message history for reconnecting user
        if (room.firstMessageAt) {
          const remaining = Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt));
          socket.emit('countdown-sync', { remaining });
        }

        // Store mapping
        userSockets.set(userId, { roomId, nickname, socketId: socket.id });

        return;
      }
    }

    // Count active (non-disconnected) users
    const activeUsers = room.users.filter(u => !u.disconnected);
    if (activeUsers.length >= 2) {
      socket.emit('error-msg', { message: '房间已满（最多2人）' });
      return;
    }

    // New user
    currentRoom = roomId;
    nickname = name || '匿名';
    userId = uuidv4();

    const userData = {
      userId,
      socketId: socket.id,
      name: nickname,
      disconnected: false,
      disconnectTimer: null
    };

    room.users.push(userData);
    socket.join(roomId);

    // Tell this user their userId for reconnection
    socket.emit('your-user-id', { userId });

    // Notify the room
    io.to(roomId).emit('user-joined', {
      name: nickname,
      userCount: room.users.filter(u => !u.disconnected).length
    });

    // Send current countdown if active
    if (room.firstMessageAt) {
      const remaining = Math.max(0, BURN_TIMEOUT - (Date.now() - room.firstMessageAt));
      socket.emit('countdown-sync', { remaining });
    }

    // Store mapping
    userSockets.set(userId, { roomId, nickname, socketId: socket.id });
  });

  socket.on('send-message', ({ text, image }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.burned) return;

    // Limit image size to 2MB base64
    if (image && image.data && image.data.length > 2 * 1024 * 1024) {
      socket.emit('error-msg', { message: '图片太大，请压缩后重试' });
      return;
    }

    const msg = {
      id: uuidv4(),
      sender: nickname,
      senderId: userId,
      text: text || '',
      image: image || null,  // { data: 'base64...', mime: 'image/png' }
      timestamp: Date.now()
    };
    room.messages.push(msg);

    // Start countdown on first message
    if (!room.firstMessageAt) {
      room.firstMessageAt = Date.now();
      room.burnTimer = setTimeout(() => burnRoom(currentRoom), BURN_TIMEOUT);
      io.to(currentRoom).emit('countdown-started', { duration: BURN_TIMEOUT });
    }

    io.to(currentRoom).emit('new-message', msg);

    // Send random AI supplement instantly (no API call needed)
    if (text) {
      const supplementText = getRandomSupplement();
      // Small delay to feel natural (200ms)
      setTimeout(() => {
        io.to(currentRoom).emit('ai-supplement', {
          forMessageId: msg.id,
          text: supplementText,
          senderId: userId
        });
      }, 200);
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !userId) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const userData = room.users.find(u => u.userId === userId);
    if (!userData) return;

    // Mark as disconnected but DON'T remove yet
    userData.disconnected = true;

    // Set a grace period timer
    userData.disconnectTimer = setTimeout(() => {
      // User didn't reconnect in time, actually remove them
      room.users = room.users.filter(u => u.userId !== userId);
      io.to(currentRoom).emit('user-left', {
        name: nickname,
        userCount: room.users.filter(u => !u.disconnected).length
      });
      userSockets.delete(userId);
    }, RECONNECT_GRACE);

    // Notify others that user is temporarily disconnected
    io.to(currentRoom).emit('user-disconnected', {
      name: nickname
    });

    userSockets.delete(userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Burn Chat running on port ${PORT}`);
});
