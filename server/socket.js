const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Oyun mühərriki + competition modeli ("start" icazəsini yoxlamaq üçün)
const competitionEngine = require('./modules/competition/competition.engine');
const Competition        = require('./modules/competition/competition.model');

let io;

// ─── Auth Middleware ───────────────────────────────────────────────
// Hər socket bağlantısında JWT token yoxlanılır
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token tapılmadı.'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { _id: decoded.id, role: decoded.role };
    next();
  } catch {
    next(new Error('Token etibarsızdır.'));
  }
};

// ─── Room adları ───────────────────────────────────────────────────
const rooms = {
  competition: (id) => `competition:${id}`,
  clan:        (id) => `clan:${id}`,
  chat:        (id) => `chat:${id}`,
  user:        (id) => `user:${id}`,
};

// ─── Init ──────────────────────────────────────────────────────────
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  console.log('Socket.io initialized');

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Hər user öz personal room-una qoşulur (notification üçün)
    socket.join(rooms.user(userId));

    // ── COMPETITION EVENTS ────────────────────────────────────────
    // Qeyd: oyunun gedişatını artıq MÜHƏRRİK idarə edir (competition.engine.js).
    // Socket yalnız "qoşulma / başlatma / cavab / reaksiya" siqnallarını ötürür.

    // Lobby-yə qoşul — room-a gir + digər iştirakçılara özünü bildir
    socket.on('competition:join', ({ competitionId, userId: uid, name, avatarColor }) => {
      if (!competitionId) return;
      socket.join(rooms.competition(competitionId));
      socket.to(rooms.competition(competitionId)).emit('participant:joined', {
        userId:      uid || userId,
        name:        name || 'İştirakçı',
        avatarColor: avatarColor || '#9333EA',
        score:       0,
        rank:        0,
      });
    });

    // Müəllim yarışı başladır — YALNIZ yarışın sahibi. Mühərrik oyunu sürür.
    socket.on('competition:start', async ({ competitionId }) => {
      if (!competitionId) return;
      try {
        const comp = await Competition.findById(competitionId).select('createdBy');
        if (!comp || comp.createdBy.toString() !== userId) return; // yalnız sahib
        await competitionEngine.startGame(io, competitionId);
      } catch { /* səssiz keç */ }
    });

    // Room mount olanda cari sualı istəyir (ilk sualı qaçırmamaq üçün — race həlli)
    socket.on('competition:ready', ({ competitionId }) => {
      if (!competitionId) return;
      socket.join(rooms.competition(competitionId)); // ehtiyat üçün
      competitionEngine.sendCurrentQuestionTo(socket, competitionId);
    });

    // Tələbə cavab göndərir — mühərrik xalı hesablayıb nəticəni qaytarır
    socket.on('competition:answer', (payload) => {
      if (!payload || !payload.competitionId) return;
      competitionEngine.handleAnswer(io, socket, payload).catch(() => {});
    });

    // İzləyici reaksiyası (🔥/⚡/💪) — room-dakı digərlərinə ötür
    socket.on('competition:reaction', ({ competitionId, type }) => {
      if (!competitionId || !type) return;
      socket.to(rooms.competition(competitionId)).emit('competition:reaction', { type });
    });

    // ── CLAN EVENTS ───────────────────────────────────────────────

    // Klan meydan oxuyur — hər iki klanın room-una göndərilir
    socket.on('clan:challenge', ({ challengerClanId, challengedClanId, battleId }) => {
      if (!challengerClanId || !challengedClanId) return;
      io.to(rooms.clan(challengedClanId)).emit('clan:challenge', {
        challengerClanId,
        battleId,
        message: 'Sizə meydan oxundu!',
        sentAt: new Date(),
      });
    });

    // Klan döyüşü başlayır — hər iki klanın room-una göndərilir
    socket.on('clan:battle:start', ({ challengerClanId, challengedClanId, battleId, competitionId }) => {
      if (!challengerClanId || !challengedClanId) return;
      [challengerClanId, challengedClanId].forEach((clanId) => {
        io.to(rooms.clan(clanId)).emit('clan:battle:start', {
          battleId,
          competitionId,
          message: 'Klan döyüşü başladı!',
          startedAt: new Date(),
        });
      });
    });

    // Klan döyüşü bitmə — hər iki klanın room-una göndərilir
    socket.on('clan:battle:end', ({ challengerClanId, challengedClanId, battleId, winner, scores }) => {
      if (!challengerClanId || !challengedClanId) return;
      [challengerClanId, challengedClanId].forEach((clanId) => {
        io.to(rooms.clan(clanId)).emit('clan:battle:end', {
          battleId,
          winner,
          scores,
          finishedAt: new Date(),
        });
      });
    });

    // İstifadəçi klan room-una qoşulur (clan səhifəsini açanda)
    socket.on('clan:join_room', ({ clanId }) => {
      if (!clanId) return;
      socket.join(rooms.clan(clanId));
    });

    // ── CHAT EVENTS ───────────────────────────────────────────────

    // Söhbət room-una qoşul
    socket.on('chat:join', ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(rooms.chat(conversationId));
    });

    // Mesaj göndər — room-dakı digər istifadəçiyə çatır
    socket.on('message:send', ({ conversationId, content }) => {
      if (!conversationId || !content?.trim()) return;
      socket.to(rooms.chat(conversationId)).emit('message:receive', {
        conversationId,
        senderId: userId,
        content: content.trim(),
        sentAt: new Date(),
      });
    });

    // Mesaj oxundu — göndərənə bildiriş
    socket.on('message:read', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(rooms.chat(conversationId)).emit('message:read', {
        conversationId,
        readBy: userId,
        readAt: new Date(),
      });
    });

    // ── DISCONNECT ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Socket.io avtomatik bütün room-lardan çıxarır
    });
  });

  return io;
};

// ─── Server tərəfindən notification göndər ─────────────────────────
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(rooms.user(userId.toString())).emit(event, data);
};

const emitToCompetition = (competitionId, event, data) => {
  if (!io) return;
  io.to(rooms.competition(competitionId.toString())).emit(event, data);
};

const emitToClan = (clanId, event, data) => {
  if (!io) return;
  io.to(rooms.clan(clanId.toString())).emit(event, data);
};

const getIO = () => {
  if (!io) throw new Error('Socket.io işə salınmayıb.');
  return io;
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToCompetition,
  emitToClan,
};
