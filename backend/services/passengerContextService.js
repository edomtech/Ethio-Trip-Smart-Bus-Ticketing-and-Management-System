'use strict';

const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const Notification = require('../models/Notification');
const Schedule = require('../models/Schedule');
const Route = require('../models/Route');
const Company = require('../models/Company');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');


const getPassengerDbContext = async (authenticatedUser) => {
  if (!authenticatedUser || !authenticatedUser._id) {
    const err = new Error('Passenger authentication required');
    err.statusCode = 403;
    throw err;
  }

  const userId = authenticatedUser._id;

  const [
    bookings,
    tickets,
    payments,
    refunds,
    notifications,
    upcomingSchedules,
  ] = await Promise.all([
    Booking.find({ user: userId })
      .populate('schedule', 'tripId date departureTime arrivalTime price availableSeats bookedSeats')
      .populate('companyId', 'companyName logo phone email')
      .lean({ virtuals: true }),
    Ticket.find({ user: userId })
      .lean({ virtuals: true }),
    Payment.find({ user: userId, passenger: userId })
      .lean({ virtuals: true }),
    Refund.find({ passengerId: userId })
      .lean({ virtuals: true }),
    Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean({ virtuals: true }),
    Schedule.find({ status: 'scheduled' })
      .populate('route', 'from to')
      .populate('companyId', 'companyName logo')
      .sort({ date: 1, departureTime: 1 })
      .limit(25)
      .lean({ virtuals: true }),
  ]);

  const sanitizeBooking = (b) => {
    const out = {
      ticketNumber: b.ticketNumber,
      tripType: b.tripType,
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
      totalPrice: b.totalPrice,
      baseFare: b.baseFare,
      discountAmount: b.discountAmount,
      selectedSeats: Array.isArray(b.selectedSeats) ? b.selectedSeats : [],
      bookingDate: b.bookingDate,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      expiresAt: b.expiresAt,
      cancellationReason: b.cancellationReason,
      cancelledAt: b.cancelledAt,
      refundAmount: b.refundAmount,
      refundStatus: b.refundStatus,
      receiptStatus: b.receiptStatus,
      receiptUploadedAt: b.receiptUploadedAt,
      approvedAt: b.approvedAt,
      company: b.companyId
        ? {
            companyName: b.companyId.companyName,
            logo: b.companyId.logo,
          }
        : null,
    };

    const sch = b.schedule;
    if (sch) {
      out.schedule = {
        tripId: sch.tripId,
        date: sch.date,
        departureTime: sch.departureTime,
        arrivalTime: sch.arrivalTime,
        price: sch.price,
        availableSeats: sch.availableSeats,
      };

      const route = sch.route || b.outboundLeg?.route;
      if (route) {
        out.route = {
          from: route.from,
          to: route.to,
        };
      } else if (b.outboundLeg?.date) {
        out.route = {
          from: b.outboundLeg?.schedule?.route?.from || null,
          to: b.outboundLeg?.schedule?.route?.to || null,
          date: b.outboundLeg?.date,
        };
      }
    } else if (b.outboundLeg?.date) {
      out.outboundLeg = {
        date: b.outboundLeg.date,
        departureTime: b.outboundLeg.departureTime,
        seats: Array.isArray(b.outboundLeg.seats) ? b.outboundLeg.seats : [],
      };
      const outroute = b.outboundLeg?.route;
      if (outroute) {
        out.route = {
          from: outroute.from,
          to: outroute.to,
        };
      }
    }

    return out;
  };

  const sanitizeTicket = (t) => ({
    ticketNumber: t.ticketNumber,
    status: t.status,
    verificationStatus: t.verificationStatus,
    seatNumber: t.seatNumber,
    price: t.price,
    companyName: t.companyName,
    busCompany: t.busCompany,
    route: t.route,
    from: t.from,
    to: t.to,
    travelDate: t.travelDate,
    departureTime: t.departureTime,
    createdAt: t.createdAt,
  });

  const sanitizePayment = (p) => ({
    amount: p.amount,
    currency: p.currency,
    paymentMethod: p.paymentMethod || p.method,
    status: p.status,
    txRef: p.txRef || p.chapaTxRef || p.transactionId,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
    verifiedAt: p.verifiedAt,
    chapaReference: p.chapaReference,
  });

  const sanitizeRefund = (r) => ({
    amount: r.amount,
    status: r.status,
    reason: r.reason,
    requestedAt: r.requestedAt,
    processedAt: r.processedAt,
    txRef: r.txRef,
  });

  const sanitizeNotification = (n) => ({
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
  });

  const sanitizeSchedule = (s) => ({
    tripId: s.tripId,
    date: s.date,
    departureTime: s.departureTime,
    arrivalTime: s.arrivalTime,
    price: s.price,
    availableSeats: s.availableSeats,
    company: s.companyId
      ? {
          companyName: s.companyId.companyName,
        }
      : null,
    route: s.route
      ? {
          from: s.route.from,
          to: s.route.to,
        }
      : null,
  });

  return {
    user: {
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      phone: authenticatedUser.phone,
      city: authenticatedUser.city,
      preferredLanguage: authenticatedUser.preferredLanguage,
      isLoggedIn: true,
    },
    bookings: bookings.map(sanitizeBooking),
    tickets: tickets.map(sanitizeTicket),
    payments: payments.map(sanitizePayment),
    refunds: refunds.map(sanitizeRefund),
    notifications: notifications.map(sanitizeNotification),
    publicSchedules: upcomingSchedules.map(sanitizeSchedule),
    contextVersion: '2026-10-03-passenger-db-grounded',
  };
};

module.exports = { getPassengerDbContext };