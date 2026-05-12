const groupService = require('./group.service');

const createGroup = async (req, res, next) => {
  try {
    const data = await groupService.createGroup(req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getAllGroups = async (req, res, next) => {
  try {
    const data = await groupService.getAllGroups();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const data = await groupService.getGroupById(groupId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const data = await groupService.updateGroup(groupId, req.body);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    await groupService.deleteGroup(groupId);
    return res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const addStudent = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { studentId } = req.body;
    const data = await groupService.addStudentToGroup(groupId, studentId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const removeStudent = async (req, res, next) => {
  try {
    const { groupId, studentId } = req.params;
    const data = await groupService.removeStudentFromGroup(groupId, studentId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addStudent,
  removeStudent,
};