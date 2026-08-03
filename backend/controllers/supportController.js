const SupportTicket = require('../models/SupportTicket');

// @desc    Get support tickets
// @route   GET /api/support
// @access  Private (Admin/Agent)
const getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email')
      .sort('-createdAt');
    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

// @desc    Create support ticket
// @route   POST /api/support
// @access  Private
const createSupportTicket = async (req, res, next) => {
  try {
    const { issueType, description, passengerName, passengerPhone } = req.body;
    if (!issueType || !description) {
      return res.status(400).json({ message: 'Issue type and description are required' });
    }

    const ticket = await SupportTicket.create({
      passengerName: passengerName || req.user.name,
      passengerPhone: passengerPhone || req.user.phone,
      user: req.user._id,
      issueType,
      description,
    });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
};

// @desc    Update support ticket status / resolution
// @route   PUT /api/support/:id
// @access  Private (Admin/Agent)
const updateSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
};
