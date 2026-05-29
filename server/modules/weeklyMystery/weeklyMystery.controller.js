const WeeklyMystery = require('./weeklyMystery.model');
const User = require('../user/user.model');

// Növbəti bazar ertəsi 09:00 (waiting geri sayımı üçün)
const nextMonday9 = () => {
  const d = new Date();
  const day = d.getDay(); // 0=bazar, 1=bazar ertəsi
  let add;
  if (day === 1) add = d.getHours() < 9 ? 0 : 7;
  else if (day === 0) add = 1;
  else add = 8 - day;
  d.setDate(d.getDate() + add);
  d.setHours(9, 0, 0, 0);
  return d;
};

const toQuestionDTO = (m, revealAnswer = false) => ({
  _id:          m._id,
  text:         m.text,
  difficulty:   m.difficulty,
  weekNumber:   m.weekNumber,
  revealedAt:   m.revealedAt,
  attemptCount: m.attempts.length,
  isSolved:     m.status === 'solved',
  winner: m.winner && m.winner.userId ? {
    userId:          String(m.winner.userId),
    name:            m.winner.name,
    city:            m.winner.city,
    avatarColor:     m.winner.avatarColor,
    solvedInMinutes: m.winner.solvedInMinutes,
    solvedAt:        m.winner.solvedAt,
    weekNumber:      m.weekNumber,
  } : undefined,
  answer: revealAnswer ? m.correctAnswer : undefined,
});

const getCurrent = async (req, res, next) => {
  try {
    const latest = await WeeklyMystery.findOne({ status: { $in: ['active', 'solved'] } })
      .sort({ revealedAt: -1 })
      .select('+correctAnswer');

    if (latest && latest.status === 'active') {
      return res.json({ success: true, data: { status: 'active', question: toQuestionDTO(latest) } });
    }
    if (latest && latest.status === 'solved') {
      return res.json({ success: true, data: { status: 'solved', question: toQuestionDTO(latest, true) } });
    }
    return res.json({ success: true, data: { status: 'waiting', nextRevealAt: nextMonday9().toISOString() } });
  } catch (err) {
    next(err);
  }
};

const getWinners = async (req, res, next) => {
  try {
    const solved = await WeeklyMystery.find({ status: 'solved', 'winner.userId': { $ne: null } })
      .sort({ 'winner.solvedAt': -1 })
      .limit(8);
    const winners = solved.map((m) => ({
      userId:          String(m.winner.userId),
      name:            m.winner.name || 'Qalib',
      city:            m.winner.city || '',
      avatarColor:     m.winner.avatarColor || '#9333EA',
      solvedInMinutes: m.winner.solvedInMinutes || 0,
      solvedAt:        m.winner.solvedAt,
      weekNumber:      m.weekNumber,
    }));
    res.json({ success: true, data: winners });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const m = await WeeklyMystery.findOne({ status: { $in: ['active', 'solved'] } }).sort({ revealedAt: -1 });
    if (!m) {
      return res.json({ success: true, data: { attemptCount: 0, solvedCount: 0, fastestMinutes: 0, fastestSeconds: 0 } });
    }
    const correct = m.attempts.filter((a) => a.isCorrect);
    const fastest = correct.length ? Math.min(...correct.map((a) => a.responseTime || 0)) : 0;
    res.json({
      success: true,
      data: {
        attemptCount:   m.attempts.length,
        solvedCount:    correct.length,
        fastestMinutes: Math.floor(fastest / 60),
        fastestSeconds: fastest % 60,
      },
    });
  } catch (err) {
    next(err);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const { answer, explanation, responseTime } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, message: 'Cavab tələb olunur.' });
    }

    const m = await WeeklyMystery.findOne({ status: 'active' }).sort({ revealedAt: -1 }).select('+correctAnswer');
    if (!m) {
      return res.status(404).json({ success: false, message: 'Aktiv sir yoxdur.' });
    }

    const isCorrect = m.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
    m.attempts.push({
      userId:       req.user._id,
      answer:       answer.trim(),
      explanation:  explanation || '',
      responseTime: responseTime || 0,
      isCorrect,
      submittedAt:  new Date(),
    });

    // İlk düzgün cavab → qalib + solved
    if (isCorrect && !m.winner.userId) {
      const user = await User.findById(req.user._id);
      const minutes = Math.max(1, Math.round((Date.now() - new Date(m.revealedAt).getTime()) / 60000));
      m.winner = {
        userId:          req.user._id,
        name:            [user?.name, user?.surname].filter(Boolean).join(' ') || 'Qalib',
        city:            '',
        avatarColor:     '#9333EA',
        solvedInMinutes: minutes,
        solvedAt:        new Date(),
      };
      m.status = 'solved';
    }

    await m.save();
    res.json({ success: true, data: { correct: isCorrect } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCurrent, getWinners, getStats, submitAnswer };
