const Competition = require('./competition.model');
const { awardXP } = require('../gamification/gamification.service');
const { sendToStudent } = require('../notification/notification.service');
const { addTimelineEntry, updateSkillTree } = require('../portfolio/portfolio.service');

const generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const runFinishSideEffect = async (competitionId, participant, sideEffect, action) => {
  try {
    await action();
  } catch (error) {
    console.warn('[competition.finish.sideEffect]', {
      competitionId: competitionId.toString(),
      participantId: participant.studentId?.toString(),
      sideEffect,
      message: error?.message || String(error),
    });
  }
};

const createCompetition = async (userId, { title, groupId, questions }) => {
  let pin = generatePin();
  let exists = await Competition.findOne({ pin });
  while (exists) {
    pin = generatePin();
    exists = await Competition.findOne({ pin });
  }

  const competition = await Competition.create({
    title,
    createdBy: userId,
    groupId: groupId || null,
    questions,
    pin,
    status: 'waiting',
  });

  return competition;
};

const joinCompetition = async (pin, studentId) => {
  const competition = await Competition.findOne({ pin });
  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  if (competition.status !== 'waiting') {
    const error = new Error('Competition already started or finished');
    error.statusCode = 400;
    throw error;
  }

  const alreadyJoined = competition.participants.some(
    (p) => p.studentId.toString() === studentId.toString()
  );
  if (alreadyJoined) {
    const error = new Error('Already joined');
    error.statusCode = 409;
    throw error;
  }

  competition.participants.push({ studentId });
  await competition.save();

  return competition;
};

const startCompetition = async (competitionId, userId) => {
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  if (competition.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  if (competition.status !== 'waiting') {
    const error = new Error('Competition cannot be started');
    error.statusCode = 400;
    throw error;
  }

  competition.status = 'active';
  competition.startedAt = new Date();
  await competition.save();

  return competition;
};

const submitAnswer = async (competitionId, studentId, { questionId, selectedAnswer, responseTime }) => {
  const competition = await Competition.findById(competitionId).populate('questions.questionId');
  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  if (competition.status !== 'active') {
    const error = new Error('Competition is not active');
    error.statusCode = 400;
    throw error;
  }

  const alreadyAnswered = competition.answers.some(
    (a) =>
      a.studentId.toString() === studentId.toString() &&
      a.questionId.toString() === questionId
  );
  if (alreadyAnswered) {
    const error = new Error('Already answered this question');
    error.statusCode = 409;
    throw error;
  }

  const qEntry = competition.questions.find(
    (q) => q.questionId._id.toString() === questionId
  );
  if (!qEntry) {
    const error = new Error('Question not found in competition');
    error.statusCode = 404;
    throw error;
  }

  const isCorrect = selectedAnswer === qEntry.questionId.correctAnswer;
  const timeBonus = isCorrect ? Math.max(0, Math.round((qEntry.timeLimit * 1000 - responseTime) / 100)) : 0;
  const pointsEarned = isCorrect ? qEntry.points + timeBonus : 0;

  competition.answers.push({
    studentId,
    questionId,
    selectedAnswer,
    isCorrect,
    responseTime,
    pointsEarned,
  });

  const participant = competition.participants.find(
    (p) => p.studentId.toString() === studentId.toString()
  );
  if (participant) {
    participant.score += pointsEarned;
    participant.totalAnswers += 1;
    if (isCorrect) participant.correctAnswers += 1;
  }

  await competition.save();
  return { isCorrect, pointsEarned };
};

const finishCompetition = async (competitionId, userId) => {
  const competition = await Competition.findById(competitionId).populate('questions.questionId', 'subject');
  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  if (competition.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  if (competition.status === 'finished') {
    const error = new Error('Competition already finished');
    error.statusCode = 400;
    throw error;
  }

  competition.status = 'finished';
  competition.finishedAt = new Date();

  const sorted = [...competition.participants].sort((a, b) => b.score - a.score);
  sorted.forEach((p, i) => {
    const participant = competition.participants.find(
      (x) => x.studentId.toString() === p.studentId.toString()
    );
    if (participant) participant.rank = i + 1;
  });

   await competition.save();

  // Yarışın fənni (skillTree üçün) + sual sayı — bütün iştirakçılara eyni
  const subject = (competition.questions[0] && competition.questions[0].questionId && competition.questions[0].questionId.subject) || 'Ümumi';
  const totalQ  = competition.questions.length || 1;

  for (const participant of competition.participants) {
    if (participant.score > 0) {
      await runFinishSideEffect(competition._id, participant, 'awardXP', () =>
        awardXP(participant.studentId, {
          score: participant.score,
          percentage: Math.round((participant.correctAnswers / totalQ) * 100),
          assessmentId: competition._id,
          submissionCount: 1,
        })
      );
    }

    await runFinishSideEffect(competition._id, participant, 'sendToStudent', () =>
      sendToStudent(participant.studentId, {
        type: 'assessment_result',
        title: 'Yarış bitdi!',
        message: `${competition.title} yarışında ${participant.rank}-ci oldun`,
        meta: { competitionId: competition._id, rank: participant.rank, score: participant.score },
      })
    );

    // Portfolio (BIO) — hər yarışı tələbənin daimi tarixçəsinə yaz
    await runFinishSideEffect(competition._id, participant, 'updateSkillTree', () =>
      updateSkillTree(participant.studentId, subject, participant.score)
    );
    await runFinishSideEffect(competition._id, participant, 'addTimelineEntry', () =>
      addTimelineEntry(participant.studentId, {
        type:        'competition',
        title:       competition.title,
        description: `${participant.rank}-ci yer · ${participant.correctAnswers}/${totalQ} düzgün`,
        xpEarned:    participant.score,
        verified:    true,
      })
    );
  }

  return competition;
};

const getCompetition = async (competitionId) => {
  return Competition.findById(competitionId)
    .populate('questions.questionId')
    .populate({ path: 'participants.studentId', populate: { path: 'userId', select: 'name surname' } });
};
const getResults = async (competitionId, userId) => {
  const competition = await Competition.findById(competitionId)
    .populate('questions.questionId', 'subject')
    .populate({ path: 'participants.studentId', populate: { path: 'userId', select: 'name surname characterType' } });

  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  // Hər tələbənin cavab vaxtları (ms) — orta hesablamaq üçün
  const sumTime = {};
  const cntTime = {};
  for (const a of competition.answers) {
    const sid = a.studentId.toString();
    sumTime[sid] = (sumTime[sid] || 0) + a.responseTime;
    cntTime[sid] = (cntTime[sid] || 0) + 1;
  }

  const sorted = [...competition.participants].sort((a, b) => b.score - a.score);

  const participants = sorted.map((p, i) => {
    const sid = p.studentId && p.studentId._id ? p.studentId._id.toString() : '';
    const u = p.studentId && p.studentId.userId;
    const cnt = cntTime[sid] || 0;
    return {
      userId: u ? u._id.toString() : sid,
      name: u ? `${u.name} ${u.surname || ''}`.trim() : 'İştirakçı',
      avatarColor: u && u.characterType === 'logi' ? '#3B82F6' : '#9333EA',
      score: p.score,
      rank: i + 1,
      correctCount: p.correctAnswers,
      wrongCount: Math.max(0, p.totalAnswers - p.correctAnswers),
      avgResponseTime: cnt ? Math.round((sumTime[sid] / cnt / 1000) * 10) / 10 : 0,
    };
  });

  const me = participants.find((x) => x.userId === userId.toString());

  return {
    competitionId: competition._id,
    title: competition.title,
    subject: (competition.questions[0] && competition.questions[0].questionId && competition.questions[0].questionId.subject) || 'Yarış',
    participants,
    myResult: me
      ? { rank: me.rank, score: me.score, xpEarned: me.score, correctCount: me.correctCount, wrongCount: me.wrongCount, avgResponseTime: me.avgResponseTime }
      : { rank: 0, score: 0, xpEarned: 0, correctCount: 0, wrongCount: 0, avgResponseTime: 0 },
    isClanBattle: false,
    isHost: competition.createdBy.toString() === userId.toString(),

  };
};


module.exports = {
  createCompetition,
  joinCompetition,
  startCompetition,
  submitAnswer,
  finishCompetition,
  getCompetition,
  getResults,
};
