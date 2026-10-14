const busService = require('../services/busService');

const getBuses = async (req, res, next) => {
  try {
    const buses = await busService.getBuses(req.user, req.query);
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

const getBusById = async (req, res, next) => {
  try {
    const bus = await busService.getBusById(req.params.id, req.user);
    res.json(bus);
  } catch (err) {
    next(err);
  }
};

const createBus = async (req, res, next) => {
  try {
    const bus = await busService.createBus(req.body, req.user);
    res.status(201).json({ success: true, bus });
  } catch (err) {
    next(err);
  }
};

const updateBus = async (req, res, next) => {
  try {
    const bus = await busService.updateBus(req.params.id, req.body, req.user);
    res.json({ success: true, bus });
  } catch (err) {
    next(err);
  }
};

const deleteBus = async (req, res, next) => {
  try {
    const result = await busService.deleteBus(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getPublicBuses = async (req, res, next) => {
  try {
    const buses = await busService.getPublicBuses();
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBuses,
  getPublicBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
};
