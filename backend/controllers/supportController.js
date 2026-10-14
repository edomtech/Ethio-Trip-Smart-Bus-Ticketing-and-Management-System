const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Booking = require('../models/Booking');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => (user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null);


const assertTicketAccess = (user, ticket) => {
  const ticketUserId = ticket.user?._id?.toString() || ticket.user?.toString() || null;
  const ticketCompanyId = ticket.companyId?._id?.toString() || ticket.companyId?.toString() || null;

  if (isSuper(user)) return;

  if (user.role === 'passenger') {
    if (!ticketUserId || ticketUserId !== user._id.toString()) {
      const err = new Error('Access denied: You do not own this support ticket.');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const userCompanyId = getCompId(user);
  if (!userCompanyId || !ticketCompanyId || userCompanyId !== ticketCompanyId) {
    const err = new Error('Access denied: Support request belongs to another company.');
    err.statusCode = 403;
    throw err;
  }
};

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

const getSupportTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('respondedBy', 'name email')
      .populate({ path: 'booking', select: 'ticketNumber status totalPrice' });

    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    assertTicketAccess(req.user, ticket);

    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

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

    const validBookingId = (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) ? bookingId : null;

    let resolvedCompanyId = null;

    if (isSuper(req.user)) {
      resolvedCompanyId =
        companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId) ? companyId : null;
    } else if (req.user.companyId) {
      resolvedCompanyId = getCompId(req.user);
    }

    if (!resolvedCompanyId && validBookingId) {
      const booking = await Booking.findById(validBookingId).select('companyId user');
      if (!booking) {
        return res.status(404).json({ message: 'The referenced booking was not found' });
      }
      if (req.user.role === 'passenger' && booking.user?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: that booking belongs to another passenger.' });
      }
      resolvedCompanyId = booking.companyId?._id?.toString() || booking.companyId?.toString() || null;
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({
        message: 'Please choose the bus company you are contacting, or reference one of your bookings.',
      });
    }

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
      companyId: resolvedCompanyId,
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

    try {
      const companyStaff = await User.find({
        companyId: resolvedCompanyId,
        role: { $in: ['agent', 'company_staff', 'company_admin'] },
      });

      for (const staff of companyStaff) {
        await Notification.create({
          user: staff._id,
          companyId: resolvedCompanyId,
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

const addMessageToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message cannot be empty' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support conversation not found' });

    assertTicketAccess(req.user, ticket);

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
      ticket.status = 'IN_PROGRESS';
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

const updateSupportTicketStatus = async (req, res, next) => {
  try {
    const { status, agentNotes } = req.body;  
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    assertTicketAccess(req.user, ticket);

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

const deleteSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    assertTicketAccess(req.user, ticket);

    await SupportTicket.findByIdAndDelete(ticket._id);
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
