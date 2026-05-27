const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

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

  // Bütün bağlantılarda auth yoxla
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Hər user öz personal room-una avtomatik qoşulur
    // Bu room notification göndərmək üçün işlənir
    socket.join(rooms.user(userId));

    // ── COMPETITION EVENTS ────────────────────────────────────────

    // Tələbə yarışa qoşulur
    socket.on('competition:join', ({ competitionId }) => {
      if (!competitionId) return;
      socket.join(rooms.competition(competitionId));
      socket.to(rooms.competition(competitionId)).emit('competition:participant_joined', {
        userId,
        message: 'Yeni iştirakçı qoşuldu.',
      });
    });

    // Müəllim yarışı başladır — bütün room-a göndərilir
    socket.on('competition:start', ({ competitionId }) => {
      if (!competitionId) return;
      io.to(rooms.competition(competitionId)).emit('competition:start', {
        competitionId,
        message: 'Yarış başladı!',
        startedAt: new Date(),
      });
    });

    // Müəllim sual göndərir
    socket.on('competition:question', ({ competitionId, question, index, total }) => {
      if (!competitionId || !question) return;
      io.to(rooms.competition(competitionId)).emit('competition:question', {
        question,
        index,
        total,
        sentAt: new Date(),
      });
    });

    // Tələbə cavab göndərir — yalnız müəllimə (room-a deyil)
    socket.on('competition:answer', ({ competitionId, questionId, answer }) => {
      if (!competitionId || !questionId) return;
      socket.to(rooms.competition(competitionId)).emit('competition:answer_received', {
        userId,
        questionId,
        answer,
        answeredAt: new Date(),
      });
    });

    // Sualın nəticəsi — bütün room-a göndərilir
    socket.on('competition:result', ({ competitionId, questionId, results }) => {
      if (!competitionId) return;
      io.to(rooms.competition(competitionId)).emit('competition:result', {
        questionId,
        results,
        sentAt: new Date(),
      });
    });

    // Yarış bitmə — bütün room-a göndərilir
    socket.on('competition:end', ({ competitionId, finalScores }) => {
      if (!competitionId) return;
      io.to(rooms.competition(competitionId)).emit('competition:end', {
        finalScores,
        finishedAt: new Date(),
      });
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
// Bu funksiya digər modullardan çağrılır
// Məsələn: notificationService.createNotification() sonra bu çağrılır
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
