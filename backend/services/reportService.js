const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const ConductorReport = require('../models/ConductorReport');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');
const { buildCompanyFilter } = require('./tenantScope');

const getOverviewMetrics = async (user) => {
  const companyQuery = buildCompanyFilter(
    user,
    {},
    'Access denied: your account is not assigned to a transport company'
  );
  const scopedToCompany = Object.prototype.hasOwnProperty.call(companyQuery, 'companyId');

  const [companies, users, buses, routes, schedules, bookings, payments, conductorReports] = await Promise.all([
    scopedToCompany ? Company.find({ _id: companyQuery.companyId }) : Company.find({}),
    scopedToCompany ? User.find(companyQuery) : User.find({}),
    Bus.find(companyQuery),
    Route.find(companyQuery),
    Schedule.find(companyQuery),
    Booking.find(companyQuery)
      .populate('companyId', 'companyName logo')
      .populate({ path: 'schedule', populate: ['bus', 'route'] }),
    Payment.find(companyQuery),
    ConductorReport.find(companyQuery),
  ]);

  const successfulPayments = payments.filter((p) => p.status === PAYMENT_STATUS.PAID || p.status === 'completed');
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => new Date(b.createdAt).toISOString().split('T')[0] === todayStr);
  const todayRevenue = todayBookings
    .filter((b) => b.paymentStatus === PAYMENT_STATUS.PAID || b.paymentStatus === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const pendingBookings = bookings.filter((b) => [BOOKING_STATUS.PENDING_PAYMENT, 'pending', 'PENDING'].includes(b.status)).length;
  const confirmedBookings = bookings.filter((b) => [BOOKING_STATUS.CONFIRMED, 'confirmed'].includes(b.status)).length;
  const cancelledBookings = bookings.filter((b) => [BOOKING_STATUS.CANCELLED, 'cancelled'].includes(b.status)).length;
  const completedBookings = bookings.filter((b) => [BOOKING_STATUS.COMPLETED, 'completed'].includes(b.status)).length;

  const totalPaymentsCount = payments.length;
  const pendingPaymentsCount = payments.filter((p) => [PAYMENT_STATUS.PENDING, 'pending'].includes(p.status)).length;
  const failedPaymentsCount = payments.filter((p) => [PAYMENT_STATUS.FAILED, 'failed'].includes(p.status)).length;
  const refundedPaymentsCount = payments.filter((p) => [PAYMENT_STATUS.REFUNDED, 'refunded'].includes(p.status)).length;

  const refundBookings = bookings.filter((b) => b.refundStatus && b.refundStatus !== 'NONE');
  const totalRefundsCount = refundBookings.length;
  const pendingRefundsCount = refundBookings.filter((b) => b.refundStatus === 'PENDING').length;
  const approvedRefundsCount = refundBookings.filter((b) => b.refundStatus === 'APPROVED').length;
  const completedRefundsCount = refundBookings.filter((b) => b.refundStatus === 'PROCESSED' || b.refundStatus === 'REFUNDED').length;
  const totalRefundAmount = refundBookings.reduce((sum, b) => sum + (b.refundAmount || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inRange = (date, from, to) => {
    const t = new Date(date).getTime();
    return t >= from.getTime() && t < to.getTime();
  };

  const isPaid = (b) => b.paymentStatus === PAYMENT_STATUS.PAID || b.paymentStatus === 'completed';

  const monthBookings = bookings.filter((b) => inRange(b.createdAt, monthStart, now));
  const prevMonthBookings = bookings.filter((b) => inRange(b.createdAt, prevMonthStart, monthStart));

  const sumRevenue = (list) =>
    list.filter(isPaid).reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const uniquePassengers = (list) => {
    const ids = new Set();
    for (const b of list) {
      if (b.user) ids.add(b.user.toString());
      else if (b.passenger?.email) ids.add(b.passenger.email.toLowerCase().trim());
      else if (b.passenger?.phone) ids.add(b.passenger.phone.trim());
      else if (b.passenger?.name) ids.add(b.passenger.name.trim().toLowerCase());
      else if (b._id) ids.add(b._id.toString());
    }
    return ids.size;
  };

  const monthRevenue = sumRevenue(monthBookings);
  const prevMonthRevenue = sumRevenue(prevMonthBookings);
  const monthPassengers = uniquePassengers(monthBookings);
  const prevMonthPassengers = uniquePassengers(prevMonthBookings);
  const monthCancellations = monthBookings.filter((b) => b.status === BOOKING_STATUS.CANCELLED).length;
  const prevMonthCancellations = prevMonthBookings.filter((b) => b.status === BOOKING_STATUS.CANCELLED).length;
  const monthSeatsSold = monthBookings
    .filter(isPaid)
    .reduce((sum, b) => sum + ((b.selectedSeats || []).length || 1), 0);
  const monthAvgFare = monthSeatsSold > 0 ? Math.round(monthRevenue / monthSeatsSold) : 0;
  const prevMonthSeatsSold = prevMonthBookings
    .filter(isPaid)
    .reduce((sum, b) => sum + ((b.selectedSeats || []).length || 1), 0);
  const prevMonthAvgFare = prevMonthSeatsSold > 0 ? Math.round(prevMonthRevenue / prevMonthSeatsSold) : 0;

  const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const activeBuses = buses.filter((b) => b.status !== 'inactive').length;
  const activeRoutes = routes.filter((r) => r.status !== 'inactive').length;

  const allTimeUniquePassengers = uniquePassengers(bookings);
  const totalSeatsBooked = bookings.reduce(
    (sum, b) => sum + ((Array.isArray(b.selectedSeats) && b.selectedSeats.length > 0) ? b.selectedSeats.length : ((Array.isArray(b.outboundLeg?.seats) && b.outboundLeg.seats.length > 0) ? b.outboundLeg.seats.length : 1)),
    0
  );

  return {
    activeBuses,
    activeRoutes,
    totalPassengers: scopedToCompany
      ? (allTimeUniquePassengers || totalSeatsBooked)
      : (users.filter((u) => u.role === 'passenger').length || allTimeUniquePassengers),
    totalSeatsBooked,
    allTimeUniquePassengers,
    todayRevenue,
    todayBookingsCount: todayBookings.length,
    monthRevenue,
    prevMonthRevenue,
    monthRevenueChange: pctChange(monthRevenue, prevMonthRevenue),
    monthBookingsCount: monthBookings.length,
    prevMonthBookingsCount: prevMonthBookings.length,
    monthBookingsChange: pctChange(monthBookings.length, prevMonthBookings.length),
    monthPassengers,
    prevMonthPassengers,
    monthPassengersChange: pctChange(monthPassengers, prevMonthPassengers),
    monthCancellations,
    prevMonthCancellations,
    monthCancellationsChange: pctChange(monthCancellations, prevMonthCancellations),
    monthAvgFare,
    prevMonthAvgFare,
    monthAvgFareChange: pctChange(monthAvgFare, prevMonthAvgFare),
    period: {
      monthStart: monthStart.toISOString().slice(0, 10),
      prevMonthStart: prevMonthStart.toISOString().slice(0, 10),
    },
    totalCompanies: companies.length,
    totalUsers: users.length,
    totalBuses: buses.length,
    totalRoutes: routes.length,
    totalSchedules: schedules.length,
    totalBookings: bookings.length,
    totalPaymentsCount,
    totalRevenue,
    conductorReportsCount: conductorReports.length,
    bookingsBreakdown: {
      pending: pendingBookings,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      completed: completedBookings,
    },
    paymentsBreakdown: {
      total: totalPaymentsCount,
      paid: successfulPayments.length,
      pending: pendingPaymentsCount,
      failed: failedPaymentsCount,
      refunded: refundedPaymentsCount,
    },
    refundsBreakdown: {
      total: totalRefundsCount,
      pending: pendingRefundsCount,
      approved: approvedRefundsCount,
      completed: completedRefundsCount,
      totalRefundAmount,
    },
  };
};

const getPublicStats = async () => {
  const [schedulesCount, bookingsCount, busesCount, routesCount, passengersCount] = await Promise.all([
    Schedule.countDocuments({ status: { $ne: 'cancelled' } }),
    Booking.countDocuments(),
    Bus.countDocuments({ status: { $ne: 'inactive' } }),
    Route.countDocuments({ status: { $ne: 'inactive' } }),
    User.countDocuments({ role: 'passenger' }),
  ]);
  return {
    totalSchedules: schedulesCount || 0,
    totalBookings: bookingsCount || 0,
    totalBuses: busesCount || 0,
    totalRoutes: routesCount || 0,
    totalPassengers: passengersCount || 0,
  };
};

module.exports = {
  getOverviewMetrics,
  getPublicStats,
};
