const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Get dashboard metrics & overview reports
// @route   GET /api/reports/overview
// @access  Private/Admin
const getOverviewReport = async (req, res, next) => {
  try {
    const [users, buses, routes, schedules, bookings, payments] = await Promise.all([
      User.find(),
      Bus.find(),
      Route.find(),
      Schedule.find(),
      Booking.find().populate({ path: 'schedule', populate: ['bus', 'route'] }),
      Payment.find({ status: 'completed' }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const passengers = users.filter((u) => u.role === 'passenger');
    const agents = users.filter((u) => u.role === 'agent');

    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((b) => ({
        _id: b._id,
        ticketNumber: b.ticketNumber,
        passengerName: b.passenger?.name || 'Passenger',
        route: `${b.schedule?.route?.from || ''} → ${b.schedule?.route?.to || ''}`,
        amount: b.totalPrice,
        status: b.status,
        date: b.createdAt,
      }));

    res.json({
      stats: {
        totalRevenue,
        totalBookings: bookings.length,
        activeBuses: buses.filter((b) => b.status === 'active').length,
        totalRoutes: routes.length,
        totalPassengers: passengers.length,
        totalAgents: agents.length,
        totalSchedules: schedules.length,
      },
      recentBookings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewReport,
};
