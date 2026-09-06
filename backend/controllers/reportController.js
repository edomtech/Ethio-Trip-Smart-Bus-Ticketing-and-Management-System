const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const ConductorReport = require('../models/ConductorReport');

// @desc    Get dashboard metrics & overview reports (Super Admin / Company Admin)
// @route   GET /api/reports/overview
// @access  Private (Super Admin, Company Admin)
const getOverviewReport = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin' || (req.user.role === 'admin' && !req.user.companyId);
    const userCompanyId = req.user.companyId?._id || req.user.companyId;

    const companyQuery = isSuperAdmin ? {} : { companyId: userCompanyId };

    const [companies, users, buses, routes, schedules, bookings, payments, conductorReports] = await Promise.all([
      Company.find(),
      User.find(isSuperAdmin ? {} : { companyId: userCompanyId }),
      Bus.find(companyQuery),
      Route.find(companyQuery),
      Schedule.find(companyQuery),
      Booking.find(companyQuery).populate('companyId', 'companyName logo').populate({ path: 'schedule', populate: ['bus', 'route'] }),
      Payment.find(companyQuery),
      ConductorReport.find(companyQuery),
    ]);

    // Financial calculations
    const successfulPayments = payments.filter((p) => p.status === 'completed' || p.status === 'PAID');
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter((b) => new Date(b.createdAt).toISOString().split('T')[0] === todayStr);
    const todayRevenue = todayBookings
      .filter((b) => b.paymentStatus === 'completed' || b.paymentStatus === 'PAID')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Booking Status Breakdown
    const pendingBookings = bookings.filter((b) => ['pending', 'PENDING', 'PENDING_PAYMENT'].includes(b.status)).length;
    const confirmedBookings = bookings.filter((b) => ['confirmed', 'CONFIRMED'].includes(b.status)).length;
    const cancelledBookings = bookings.filter((b) => ['cancelled', 'CANCELLED'].includes(b.status)).length;
    const completedBookings = bookings.filter((b) => ['completed', 'COMPLETED'].includes(b.status)).length;

    // Payment Status Breakdown
    const totalPaymentsCount = payments.length;
    const pendingPaymentsCount = payments.filter((p) => p.status === 'pending' || p.status === 'PENDING').length;
    const failedPaymentsCount = payments.filter((p) => p.status === 'failed' || p.status === 'FAILED').length;
    const refundedPaymentsCount = payments.filter((p) => p.status === 'refunded' || p.status === 'REFUNDED').length;

    // Refund Breakdown
    const refundBookings = bookings.filter((b) => b.refundStatus && b.refundStatus !== 'NONE');
    const totalRefundsCount = refundBookings.length;
    const pendingRefundsCount = refundBookings.filter((b) => b.refundStatus === 'PENDING').length;
    const approvedRefundsCount = refundBookings.filter((b) => b.refundStatus === 'APPROVED').length;
    const completedRefundsCount = refundBookings.filter((b) => b.refundStatus === 'PROCESSED').length;
    const rejectedRefundsCount = refundBookings.filter((b) => b.refundStatus === 'REJECTED').length;
    const totalRefundAmount = refundBookings.reduce((sum, b) => sum + (b.refundAmount || 0), 0);

    // Company stats (Platform-wide)
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.status === 'active').length;
    const pendingCompanies = companies.filter((c) => c.status === 'pending').length;
    const suspendedCompanies = companies.filter((c) => c.status === 'suspended').length;

    // Passengers & Staff
    const passengersCount = isSuperAdmin
      ? (await User.countDocuments({ role: 'passenger' }))
      : users.filter((u) => u.role === 'passenger').length;

    const agentsCount = users.filter((u) => u.role === 'agent' || u.role === 'company_staff').length;
    const conductorsCount = users.filter((u) => u.role === 'conductor').length;

    // Company Performance List (for Super Admin & Overview)
    const companyPerformance = await Promise.all(
      companies.map(async (comp) => {
        const compId = comp._id;
        const [cUsers, cBuses, cBookings, cPayments] = await Promise.all([
          User.find({ companyId: compId }),
          Bus.countDocuments({ companyId: compId }),
          Booking.countDocuments({ companyId: compId }),
          Payment.find({ companyId: compId, status: { $in: ['completed', 'PAID'] } }),
        ]);

        const compRevenue = cPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const compAgents = cUsers.filter((u) => u.role === 'agent' || u.role === 'company_staff').length;
        const compConductors = cUsers.filter((u) => u.role === 'conductor').length;

        return {
          _id: comp._id,
          companyName: comp.companyName,
          city: comp.city,
          status: comp.status,
          busesCount: cBuses,
          agentsCount: compAgents,
          conductorsCount: compConductors,
          bookingsCount: cBookings,
          revenue: compRevenue,
          rating: comp.rating || 4.8,
        };
      })
    );

    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((b) => ({
        _id: b._id,
        ticketNumber: b.ticketNumber,
        companyName: b.companyId?.companyName || 'Ethio Trip',
        passengerName: b.passenger?.name || 'Passenger',
        passengerPhone: b.passenger?.phone || '',
        route: `${b.schedule?.route?.from || ''} → ${b.schedule?.route?.to || ''}`,
        amount: b.totalPrice,
        status: b.status,
        paymentStatus: b.paymentStatus,
        refundStatus: b.refundStatus || 'NONE',
        refundAmount: b.refundAmount || 0,
        date: b.createdAt,
      }));

    res.json({
      stats: {
        totalRevenue,
        todayRevenue,
        todayBookings: todayBookings.length,
        totalBookings: bookings.length,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        totalPayments: totalPaymentsCount,
        successfulPayments: successfulPayments.length,
        pendingPayments: pendingPaymentsCount,
        failedPayments: failedPaymentsCount,
        refundedPayments: refundedPaymentsCount,
        totalRefunds: totalRefundsCount,
        pendingRefunds: pendingRefundsCount,
        approvedRefunds: approvedRefundsCount,
        completedRefunds: completedRefundsCount,
        rejectedRefunds: rejectedRefundsCount,
        totalRefundAmount,
        activeBuses: buses.filter((b) => b.status === 'active').length,
        totalBuses: buses.length,
        totalRoutes: routes.length,
        totalSchedules: schedules.length,
        totalPassengers: passengersCount,
        totalAgents: agentsCount,
        totalConductors: conductorsCount,
        totalCompanies,
        activeCompanies,
        pendingCompanies,
        suspendedCompanies,
        totalConductorReports: conductorReports.length,
        openConductorReports: conductorReports.filter((r) => r.status === 'OPEN').length,
      },
      companyPerformance,
      recentBookings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewReport,
};
