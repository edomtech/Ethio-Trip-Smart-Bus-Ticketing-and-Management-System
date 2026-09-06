const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Company = require('../models/Company');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => (user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null);

// @desc    Get support conversations (Scoped by company for Agents/Company Admins, by User for Passengers)
// @route   GET /api/support
// @access  Private
const getSupportTickets = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'passenger') {
      query.user = req.user._id;
    } else if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'User is not assigned to a company.' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId && mongoose.Types.ObjectId.isValid(req.query.companyId)) {
      query.companyId = req.query.companyId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const tickets = await SupportTicket.find(query)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('respondedBy', 'name email')
      .populate({ path: 'booking', select: 'ticketNumber status totalPrice' })
      .sort('-updatedAt');

    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single conversation thread by ID
// @route   GET /api/support/:id
// @access  Private
const getSupportTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('respondedBy', 'name email')
      .populate({ path: 'booking', select: 'ticketNumber status totalPrice' });

    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    // Multi-tenant check
    if (req.user.role === 'passenger') {
      if (ticket.user && ticket.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You do not own this support ticket.' });
      }
    } else if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId?._id?.toString() || ticket.companyId?.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({ message: 'Access denied: Support request belongs to another company.' });
      }
    }

    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new support conversation / passenger inquiry
// @route   POST /api/support
// @access  Private / Public
const createSupportTicket = async (req, res, next) => {
  try {
    const {
      companyId,
      bookingId,
      ticketNumber,
      subject,
      category,
      message,
      description,
      priority,
      passengerName,
      passengerEmail,
      passengerPhone,
    } = req.body;

    const initialMessageText = message || description;
    if (!initialMessageText) {
      return res.status(400).json({ message: 'A message or problem description is required' });
    }

    let targetCompanyId = (companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId)) ? companyId : null;
    if (!targetCompanyId) {
      const defaultComp = await Company.findOne({ status: 'active' }) || await Company.findOne();
      if (defaultComp) {
        targetCompanyId = defaultComp._id;
      } else {
        return res.status(400).json({ message: 'Target bus company is required' });
      }
    }

    const validBookingId = (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) ? bookingId : null;

    const senderName = req.user ? req.user.name : (passengerName || 'Passenger');
    const senderRole = req.user ? req.user.role : 'passenger';

    const messages = [
      {
        senderId: req.user ? req.user._id : null,
        senderName,
        senderRole,
        message: initialMessageText,
        createdAt: new Date(),
      },
    ];

    const ticket = await SupportTicket.create({
      companyId: targetCompanyId,
      booking: validBookingId,
      ticketNumber: ticketNumber || '',
      passengerName: senderName,
      passengerEmail: passengerEmail || (req.user ? req.user.email : ''),
      passengerPhone: passengerPhone || (req.user ? req.user.phone : ''),
      user: req.user ? req.user._id : null,
      subject: subject || 'General Support Request',
      category: category || 'General Inquiry',
      issueType: subject || category || 'General Inquiry',
      description: initialMessageText,
      priority: priority || 'medium',
      status: 'OPEN',
      messages,
    });

    // Notify Company Agents / Staff
    try {
      const companyStaff = await User.find({
        companyId: targetCompanyId,
        role: { $in: ['agent', 'company_staff', 'company_admin'] },
      });

      for (const staff of companyStaff) {
        await Notification.create({
          user: staff._id,
          companyId: targetCompanyId,
          type: 'support',
          title: `New Customer Support Question`,
          message: `${senderName}: "${(subject || initialMessageText).slice(0, 60)}..."`,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch staff notifications:', notifErr.message);
    }

    const populated = await SupportTicket.findById(ticket._id)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Add a message reply to an existing support conversation
// @route   POST /api/support/:id/messages
// @access  Private
const addMessageToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message cannot be empty' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support conversation not found' });

    // Multi-tenant authorization check
    if (req.user.role === 'passenger') {
      if (ticket.user && ticket.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You do not own this conversation.' });
      }
    } else if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({ message: 'Access denied: Conversation belongs to another company.' });
      }
    }

    const isStaffOrAgent = ['agent', 'company_staff', 'company_admin', 'super_admin'].includes(req.user.role);

    const newMessage = {
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: message.trim(),
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);

    if (isStaffOrAgent) {
      ticket.status = 'ANSWERED';
      ticket.respondedBy = req.user._id;
      ticket.respondedAt = new Date();
      ticket.feedbackResponse = message.trim();

      // Notify passenger
      if (ticket.user) {
        await Notification.create({
          user: ticket.user,
          companyId: ticket.companyId,
          type: 'support',
          title: `Support Reply from ${req.user.name}`,
          message: `Your inquiry "${ticket.subject}" has received a response: "${message.slice(0, 80)}..."`,
        });
      }
    } else {
      // Passenger replying back
      ticket.status = 'IN_PROGRESS';
      // Notify company staff
      const companyStaff = await User.find({
        companyId: ticket.companyId,
        role: { $in: ['agent', 'company_staff', 'company_admin'] },
      });
      for (const staff of companyStaff) {
        await Notification.create({
          user: staff._id,
          companyId: ticket.companyId,
          type: 'support',
          title: `Passenger Reply: ${ticket.subject}`,
          message: `${req.user.name}: "${message.slice(0, 80)}..."`,
        });
      }
    }

    await ticket.save();

    const updated = await SupportTicket.findById(ticket._id)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('respondedBy', 'name email');

    res.json({
      success: true,
      message: 'Message sent successfully',
      ticket: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update support ticket status (CLOSE / REOPEN / ASSIGN)
// @route   PUT /api/support/:id/status
// @access  Private
const updateSupportTicketStatus = async (req, res, next) => {
  try {
    const { status, agentNotes } = req.body; // status: 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED'
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    // Multi-tenant check
    if (req.user.role === 'passenger') {
      if (ticket.user && ticket.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You do not own this ticket.' });
      }
    } else if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({ message: 'Access denied: Ticket belongs to another company.' });
      }
    }

    if (status) ticket.status = status.toUpperCase();
    if (agentNotes !== undefined) ticket.agentNotes = agentNotes;
    if (status === 'CLOSED' || status === 'RESOLVED') ticket.resolvedAt = new Date();

    await ticket.save();

    const updated = await SupportTicket.findById(ticket._id)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('respondedBy', 'name email');

    res.json({
      success: true,
      message: `Support ticket status updated to ${ticket.status}`,
      ticket: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete support ticket (Passenger or Admin)
// @route   DELETE /api/support/:id
// @access  Private
const deleteSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    // Multi-tenant check
    if (req.user.role === 'passenger') {
      if (ticket.user && ticket.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You do not own this ticket.' });
      }
    } else if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({ message: 'Access denied: Ticket belongs to another company.' });
      }
    }

    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Support inquiry deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  addMessageToTicket,
  updateSupportTicketStatus,
  updateSupportTicket: updateSupportTicketStatus,
  deleteSupportTicket,
};


