const parentService = require('./parent.service');

const createParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.createParentProfile(userId, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.getParentProfile(userId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await parentService.updateParentProfile(userId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const deleteParent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await parentService.deleteParentProfile(userId);
    return res.status(200).json({ message: 'Parent profile deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const addChild = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { childId } = req.body;
    const data = await parentService.addChild(userId, childId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const removeChild = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { childId } = req.params;
    const data = await parentService.removeChild(userId, childId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createParent,
  getParent,
  updateParent,
  deleteParent,
  addChild,
  removeChild,
};