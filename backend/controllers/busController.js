const Bus = require('../models/Bus');

// @desc    Get all buses
// @route   GET /api/buses
// @access  Private
const getBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find().sort('-createdAt');
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

// @desc    Get bus by ID
// @route   GET /api/buses/:id
// @access  Private
const getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private/Admin
const createBus = async (req, res, next) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private/Admin
const updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete bus
// @route   DELETE /api/buses/:id
// @access  Private/Admin
const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
};
