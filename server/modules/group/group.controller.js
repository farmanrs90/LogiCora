const groupService = require('./group.service');

const createGroup = async (req, res, next) => {
  try {
    const data = await groupService.createGroup(req.user, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getAllGroups = async (req, res, next) => {
  try {
    const data = await groupService.getAllGroups(req.user);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const data = await groupService.getGroupById(req.user, groupId);
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
    const data = await groupService.addStudentToGroup(req.user, groupId, studentId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const removeStudent = async (req, res, next) => {
  try {
    const { groupId, studentId } = req.params;
    const data = await groupService.removeStudentFromGroup(req.user, groupId, studentId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const inviteStudent = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const data = await groupService.inviteStudentByEmail(req.user, groupId, req.body.email);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const saveAttendance = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const data = await groupService.saveGroupAttendance(req.user, groupId, req.body);
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
  inviteStudent,
  saveAttendance,
};