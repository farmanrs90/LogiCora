const dailyQuestionService = require('./dailyQuestion.service');

const getDaily = async (req, res, next) => {
  try {
    const data = await dailyQuestionService.getDailyQuestions(req.user, {
      subject: req.query.subject,
    });
    res.json({ success: true, data, message: 'Günün sualları uğurla alındı.' });
  } catch (err) {
    next(err);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const data = await dailyQuestionService.submitAnswer(req.user, req.body);
    const message = data.isCorrect ? 'Düzgün cavab! XP qazandınız.' : 'Yanlış cavab. Bir ürək itirdiniz.';
    res.json({ success: true, data, message });
  } catch (err) {
    next(err);
  }
};

const getDailyStatus = async (req, res, next) => {
  try {
    const data = await dailyQuestionService.getDailyStatus(req.user);
    res.json({ success: true, data, message: 'Günlük status alındı.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDaily, submitAnswer, getDailyStatus };
