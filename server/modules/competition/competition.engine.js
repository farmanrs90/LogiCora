// server/modules/competition/competition.engine.js
//
// Canlı yarışın "beyni". Server burada oyunu özü idarə edir:
// sual göndər → timer → cavabları topla → nəticə → növbəti sual → son.
// Bütün xal/sıralama SERVER-də hesablanır (klientə güvənmirik = anti-cheat).

const competitionService = require('./competition.service');
const Competition = require('./competition.model');
const Student = require('../student/student.model');

// Aktiv oyunların yaddaşda saxlanan vəziyyəti — açar: competitionId (string)
// Qeyd: server restart olsa gedən oyun itir. Yarışlar qısa olduğu üçün qəbul edilir.
const games = new Map();

const COUNTDOWN_SEC = 3;      // başlamazdan əvvəl geri sayım
const QUESTION_GAP_MS = 4000;   // sual nəticəsi göstərilib növbətiyə keçənə qədər

// ─── Köməkçi: backend sualını frontend Question formatına çevir ─────────────
// correctAnswer GİZLƏDİLİR — düzgün cavab yalnız cavab verəndən sonra gəlir.
function publicQuestion(qDoc, timeLimit) {
  return {
    _id: qDoc._id.toString(),
    text: qDoc.text,
    format: qDoc.type === 'true_false' ? 'C' : 'A',
    options: (qDoc.options || []).map((o) => ({ id: o.label, text: o.text })),
    correctAnswer: '',                 // gizli
    subject: qDoc.subject,
    ageGroups: [],
    xpReward: qDoc.points ?? 10,
    timeLimit,
  };
}

// ─── Köməkçi: DB-dən cari sıralamanı qur (ad + rəng ilə) ────────────────────
async function buildLeaderboard(competitionId) {
  const comp = await Competition.findById(competitionId).populate({
    path: 'participants.studentId',
    populate: { path: 'userId', select: 'name surname characterType' },
  });
  if (!comp) return [];

  return [...comp.participants]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => {
      const u = p.studentId && p.studentId.userId;
      return {
        userId: u ? u._id.toString() : (p.studentId ? p.studentId._id.toString() : ''),
        name: u ? `${u.name} ${u.surname || ''}`.trim() : 'İştirakçı',
        avatarColor: u && u.characterType === 'logi' ? '#3B82F6' : '#9333EA',
        score: p.score,
        rank: i + 1,
      };
    });
}

const getGame = (competitionId) => games.get(competitionId.toString());

// ─── 1) Oyunu başlat (müəllim "Başlat" basanda socket çağırır) ──────────────
async function startGame(io, competitionId) {
  const id = competitionId.toString();
  if (games.has(id)) return;                       // artıq gedir, ikiqat başlatma

  const comp = await Competition.findById(id).populate('questions.questionId');
  if (!comp || comp.questions.length === 0) return;
  if (comp.status === 'finished') return;

  // Status-u DB-də 'active' et — yoxsa submitAnswer "yarış aktiv deyil" atır.
  comp.status = 'active';
  comp.startedAt = comp.startedAt || new Date();
  await comp.save();

  games.set(id, {
    id,
    questions: comp.questions,             // [{ questionId(doc), timeLimit, points }]
    index: 0,
    questionStartedAt: 0,
    answered: new Set(),                  // bu sual üçün cavab verən studentId-lər
    timer: null,
    ending: false,
    participantCount: comp.participants.length,
  });

  // Hər kəsə geri sayım yayımla → sonra ilk sual
  io.to(`competition:${id}`).emit('competition:countdown', { seconds: COUNTDOWN_SEC });
  setTimeout(() => sendQuestion(io, id), COUNTDOWN_SEC * 1000);
}

// ─── 2) Cari sualı bütün room-a göndər + server timer-i qur ─────────────────
function sendQuestion(io, competitionId) {
  const game = getGame(competitionId);
  if (!game) return;

  const entry = game.questions[game.index];
  const timeLimit = entry.timeLimit || 30;

  game.answered = new Set();
  game.ending = false;
  game.questionStartedAt = Date.now();

  io.to(`competition:${game.id}`).emit('competition:question', {
    question: publicQuestion(entry.questionId, timeLimit),
    questionNumber: game.index + 1,
    totalQuestions: game.questions.length,
  });

  // +800ms şəbəkə gecikməsi üçün bufer. Vaxt bitəndə sualı bağla.
  game.timer = setTimeout(() => endQuestion(io, game.id), timeLimit * 1000 + 800);
}

// ─── 3) Tələbənin cavabı (socket 'competition:answer' çağırır) ──────────────
async function handleAnswer(io, socket, { competitionId, questionId, answer }) {
  const game = getGame(competitionId);
  if (!game) return;

  const entry = game.questions[game.index];
  if (!entry || entry.questionId._id.toString() !== questionId) return;   // köhnə/yanlış sual

  // socket-dəki userId → Student._id (participants Student-ə bağlıdır)
  const student = await Student.findOne({ userId: socket.user._id });
  if (!student) return;
  const sid = student._id.toString();
  if (game.answered.has(sid)) return;                // təkrar cavab — say
  game.answered.add(sid);

  // Cavab vaxtını SERVER ölçür (ms) — klient saatına güvənmirik.
  const responseTime = Date.now() - game.questionStartedAt;

  let result = { isCorrect: false, pointsEarned: 0 };
  try {
    // Mövcud service-i təkrar istifadə edirik — xal + vaxt bonusu + DB-yə yaz.
    result = await competitionService.submitAnswer(game.id, student._id, {
      questionId,
      selectedAnswer: answer,
      responseTime,
    });
  } catch { /* artıq cavablanıb/status — sakitcə keç */ }

  const board = await buildLeaderboard(game.id);
  const me = board.find((p) => p.userId === sid);

  // Nəticəni YALNIZ cavab verən tələbəyə göndər (düzgün cavabı da ona açırıq).
  socket.emit('competition:answer_result', {
    correct: result.isCorrect,
    correctAnswer: entry.questionId.correctAnswer,
    xpEarned: result.pointsEarned,
    newRank: me ? me.rank : 0,
    answeredCount: game.answered.size,
    total: game.participantCount,
  });

  // Hamı cavab verdisə → timer-i gözləmə, dərhal bağla.
  if (game.participantCount > 0 && game.answered.size >= game.participantCount) {
    clearTimeout(game.timer);
    endQuestion(io, game.id);
  }
}

// ─── 4) Sualı bağla → leaderboard yayımla → növbəti və ya son ───────────────
async function endQuestion(io, competitionId) {
  const game = getGame(competitionId);
  if (!game || game.ending) return;                  // ikiqat bağlanmadan qoru
  game.ending = true;
  clearTimeout(game.timer);

  const board = await buildLeaderboard(game.id);
  io.to(`competition:${game.id}`).emit('competition:question_end', { leaderboard: board });

  setTimeout(() => {
    const g = getGame(competitionId);
    if (!g) return;
    g.index += 1;
    if (g.index >= g.questions.length) finishGame(io, competitionId);
    else sendQuestion(io, competitionId);
  }, QUESTION_GAP_MS);
}

// ─── 5) Yarışı bitir — sıralama + XP + bildiriş (service-dən) ───────────────
async function finishGame(io, competitionId) {
  const game = getGame(competitionId);
  if (!game) return;

  const comp = await Competition.findById(game.id);
  let finalScores = [];
  if (comp) {
    // finishCompetition createdBy yoxlaması edir — sahibin id-si ilə çağırırıq.
    await competitionService.finishCompetition(game.id, comp.createdBy.toString());
    finalScores = await buildLeaderboard(game.id);
  }

  io.to(`competition:${game.id}`).emit('competition:end', { finalScores });
  games.delete(game.id);
}

// ─── Köməkçi: gec qoşulana cari sualı təkrar göndər (Room mount race üçün) ──
function sendCurrentQuestionTo(socket, competitionId) {
  const game = getGame(competitionId);
  if (!game || game.ending || !game.questionStartedAt) return;
  const entry = game.questions[game.index];
  if (!entry) return;

  const timeLimit = entry.timeLimit || 30;
  const remaining = Math.max(1, Math.ceil((timeLimit * 1000 - (Date.now() - game.questionStartedAt)) / 1000));
  socket.emit('competition:question', {
    question: publicQuestion(entry.questionId, remaining),
    questionNumber: game.index + 1,
    totalQuestions: game.questions.length,
  });
}

module.exports = { startGame, handleAnswer, getGame, sendCurrentQuestionTo };
