const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user._id);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
};

const sendPassengerEmail = async (req, res, next) => {
  try {
    const { passengerEmail, subject, message, bookingRef } = req.body;

    if (!passengerEmail || !message) {
      return res.status(400).json({ success: false, message: 'passengerEmail and message are required.' });
    }

    let passengerUserId = null;

    const emailClean = String(passengerEmail).trim().toLowerCase();
    const emailRegex = new RegExp(`^${emailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const emailService = require('../services/emailService');

    const matchedUser = await User.findOne({ email: emailRegex }).select('_id name email');

    if (req.user.role !== 'super_admin') {
      const senderCompanyId =
        req.user.companyId?._id?.toString() || req.user.companyId?.toString() || null;

      if (!senderCompanyId) {
        return res.status(403).json({ success: false, message: 'Your account is not assigned to a company.' });
      }

      const targetBooking = await Booking.findOne({
        companyId: senderCompanyId,
        $or: [
          { 'passenger.email': emailRegex },
          ...(matchedUser ? [{ user: matchedUser._id }] : []),
        ],
      }).select('_id user passenger');

      if (!targetBooking) {
        return res.status(403).json({
          success: false,
          message: 'You can only message passengers who have a booking with your company.',
        });
      }

      passengerUserId = targetBooking.user || matchedUser?._id || null;
    } else {
      passengerUserId = matchedUser?._id || null;
    }

    const senderName = req.user?.companyId?.companyName || 'Ethio Trip Bus Company';

    const result = await emailService.sendStaffMessage(emailClean, {
      subject: subject ? String(subject).slice(0, 180) : `Message from ${senderName}`,
      message: String(message).slice(0, 4000),
      senderName: String(senderName).slice(0, 120),
      bookingReference: bookingRef ? String(bookingRef).slice(0, 64) : '',
    });

    if (passengerUserId) {
      await notificationService
        .createNotification({
          user: passengerUserId,
          companyId: req.user.companyId?._id || req.user.companyId || null,
          type: 'system',
          title: subject ? String(subject).slice(0, 120) : `Message from ${senderName}`,
          message: String(message).slice(0, 500),
        })
        .catch(() => {});
    }

    if (!result.sent) {
      if (process.env.NODE_ENV !== 'production' || result.reason === 'SMTP_NOT_CONFIGURED') {
        console.log(`[EmailFallback] Message recorded for passenger ${emailClean}:`, { subject, message });
        return res.json({
          success: true,
          deliveredToInbox: false,
          message: 'Message delivered to passenger notification center.',
        });
      }
      return res.status(502).json({
        success: false,
        message: 'The email could not be delivered to the mail server. Please try again.',
      });
    }

    res.json({ success: true, message: `Message sent successfully to ${emailClean}` });
  } catch (err) {
    next(err);
  }
};

const sendTicketEmailToPassenger = async (req, res, next) => {
  try {
    const { bookingId, email } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const Booking = require('../models/Booking');
    const Ticket = require('../models/Ticket');
    const emailService = require('../services/emailService');

    const booking = await Booking.findById(bookingId)
      .populate('companyId')
      .populate({ path: 'schedule', populate: ['bus', 'route'] });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const targetEmail = email || booking.passenger?.email || booking.contactEmail;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Passenger has no email specified.' });
    }

    const tickets = await Ticket.find({ booking: bookingId });
    const primaryTicket = tickets[0] || {};

    const result = await emailService.sendTicketEmail(targetEmail, primaryTicket, booking);

    res.json({
      success: true,
      message: result.sent ? `Ticket sent to ${targetEmail}` : 'Ticket email created (SMTP notice)',
      sent: result.sent,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendPassengerEmail,
  sendTicketEmailToPassenger,
};
