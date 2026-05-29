const KidsVideo = require('./kids.model');
const KidsProgress = require('./progress.model');

const CATEGORIES = [
  { key: 'vegetables', emoji: '🥕', az: 'Tərəvəzlər' },
  { key: 'fruits',     emoji: '🍎', az: 'Meyvələr' },
  { key: 'family',     emoji: '👨‍👩‍👧', az: 'Ailə üzvləri' },
  { key: 'animals',    emoji: '🐱', az: 'Heyvanlar' },
  { key: 'colors',     emoji: '🎨', az: 'Rənglər' },
  { key: 'numbers',    emoji: '🔢', az: 'Rəqəmlər' },
  { key: 'letters',    emoji: '📝', az: 'Hərflər' },
  { key: 'emotions',   emoji: '😊', az: 'Emosiyalar' },
  { key: 'habits',     emoji: '🧼', az: 'Gündəlik vərdişlər' },
  { key: 'safety',     emoji: '⚠️', az: 'Təhlükəsizlik' },
];

const getCategories = (req, res) => {
  res.json({ success: true, data: CATEGORIES });
};

const getVideos = async (req, res, next) => {
  try {
    const { category, ageGroup } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    if (ageGroup) query.ageGroup = ageGroup;
    const videos = await KidsVideo.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: videos });
  } catch (err) { next(err); }
};

const getVideoById = async (req, res, next) => {
  try {
    const video = await KidsVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video tapılmadı.' });
    res.json({ success: true, data: video });
  } catch (err) { next(err); }
};

const incrementView = async (req, res, next) => {
  try {
    const video = await KidsVideo.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!video) return res.status(404).json({ success: false, message: 'Video tapılmadı.' });
    res.json({ success: true, data: { views: video.views } });
  } catch (err) { next(err); }
};

const completeVideo = async (req, res, next) => {
  try {
    const video = await KidsVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video tapılmadı.' });
    const xpForCompletion = 10;
    const progress = await KidsProgress.findOneAndUpdate(
      { userId: req.user._id, videoId: video._id },
      {
        $set:  { watched: true, completedAt: new Date() },
        $inc:  { xpEarned: xpForCompletion },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { xpEarned: xpForCompletion, progress } });
  } catch (err) { next(err); }
};

const answerQuestion = async (req, res, next) => {
  try {
    const { questionIndex, answer } = req.body;
    if (typeof questionIndex !== 'number') {
      return res.status(400).json({ success: false, message: 'questionIndex tələb olunur.' });
    }
    const video = await KidsVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video tapılmadı.' });
    const q = video.questions[questionIndex];
    if (!q) return res.status(400).json({ success: false, message: 'Sual tapılmadı.' });

    const correct = q.correct === answer;
    const xp = correct ? 5 : 0;
    if (correct) {
      await KidsProgress.findOneAndUpdate(
        { userId: req.user._id, videoId: video._id },
        { $inc: { questionsCorrect: 1, xpEarned: xp } },
        { upsert: true }
      );
    }
    res.json({ success: true, data: { correct, xpEarned: xp, correctAnswer: q.correct } });
  } catch (err) { next(err); }
};

const getMyProgress = async (req, res, next) => {
  try {
    const items = await KidsProgress.find({ userId: req.user._id })
      .populate('videoId', 'title titleAz thumbnail category duration');
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

module.exports = {
  getCategories,
  getVideos,
  getVideoById,
  incrementView,
  completeVideo,
  answerQuestion,
  getMyProgress,
};
