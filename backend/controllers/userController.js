const userService = require('../services/userService');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.user, req.query);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const staff = await userService.getStaff(req.user, req.query);
    res.json(staff);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await userService.toggleUserStatus(req.params.id, req.user);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getConductors = async (req, res, next) => {
  try {
    const conductors = await userService.getStaff(req.user, { ...req.query, role: 'conductor' });
    res.json(conductors);
  } catch (err) {
    next(err);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getStaff,
  getConductors,
  createStaff,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
