const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { getMyFreeze, buyFreeze, activateFreeze } = require('./streakFreeze.service');

router.use(authenticate);
router.use(checkRole('student'));

router.get('/me', async (req, res, next) => {
  try {
    const freeze = await getMyFreeze(req.user._id);
    res.status(200).json({ success: true, data: freeze, message: 'Freeze məlumatı alındı.' });
  } catch (err) {
    next(err);
  }
});

router.post('/buy', async (req, res, next) => {
  try {
    const result = await buyFreeze(req.user._id);
    res.status(200).json({ success: true, data: result, message: `Freeze alındı. Qalan gem: ${result.gemsLeft}.` });
  } catch (err) {
    next(err);
  }
});

router.post('/activate', async (req, res, next) => {
  try {
    const freeze = await activateFreeze(req.user._id);
    res.status(200).json({ success: true, data: freeze, message: 'Freeze aktivləşdirildi. Bu gün streak qorunur.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
