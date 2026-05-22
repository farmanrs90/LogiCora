const EloRating = require('./elo.model');
const Student = require('../student/student.model');

const K_FACTOR = 32;

const getExpectedScore = (ratingA, ratingB) =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

const calculateNewRating = (rating, expected, actual) =>
  Math.round(rating + K_FACTOR * (actual - expected));

const getOrCreateElo = async (studentId, subject) => {
  let elo = await EloRating.findOne({ studentId, subject });
  if (!elo) {
    elo = await EloRating.create({ studentId, subject });
  }
  return elo;
};

const updateAfterCompetition = async (winnerId, loserId, subject = 'general', isDraw = false) => {
  const [winnerElo, loserElo] = await Promise.all([
    getOrCreateElo(winnerId, subject),
    getOrCreateElo(loserId, subject),
  ]);

  const expectedWinner = getExpectedScore(winnerElo.rating, loserElo.rating);
  const expectedLoser = getExpectedScore(loserElo.rating, winnerElo.rating);

  const actualWinner = isDraw ? 0.5 : 1;
  const actualLoser = isDraw ? 0.5 : 0;

  const newWinnerRating = calculateNewRating(winnerElo.rating, expectedWinner, actualWinner);
  const newLoserRating = calculateNewRating(loserElo.rating, expectedLoser, actualLoser);

  const winnerChange = newWinnerRating - winnerElo.rating;
  const loserChange = newLoserRating - loserElo.rating;

  winnerElo.rating = newWinnerRating;
  loserElo.rating = newLoserRating;

  if (isDraw) {
    winnerElo.draws += 1;
    loserElo.draws += 1;
  } else {
    winnerElo.wins += 1;
    loserElo.losses += 1;
  }

  winnerElo.history.push({
    opponentId: loserId,
    result: isDraw ? 'draw' : 'win',
    ratingChange: winnerChange,
    date: new Date(),
  });

  loserElo.history.push({
    opponentId: winnerId,
    result: isDraw ? 'draw' : 'loss',
    ratingChange: loserChange,
    date: new Date(),
  });

  await Promise.all([winnerElo.save(), loserElo.save()]);

  return { winnerElo, loserElo, winnerChange, loserChange };
};

const getMyElo = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const ratings = await EloRating.find({ studentId: student._id });
  return ratings;
};

const getLeaderboard = async (subject = 'general') => {
  const leaderboard = await EloRating.find({ subject })
    .sort({ rating: -1 })
    .limit(50)
    .populate('studentId', 'userId grade');

  return leaderboard;
};

module.exports = {
  updateAfterCompetition,
  getMyElo,
  getLeaderboard,
};
