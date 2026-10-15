const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const Company = require('./models/Company');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Schedule = require('./models/Schedule');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Ticket = require('./models/Ticket');
const Discount = require('./models/Discount');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');
const SupportTicket = require('./models/SupportTicket');
const ConductorReport = require('./models/ConductorReport');

const { ROLES } = require('./constants/roles');
const { BOOKING_STATUS, PAYMENT_STATUS, TICKET_STATUS, BOARDING_STATUS } = require('./constants/statuses');

dotenv.config();

const getFutureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

const seed = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('❌ Could not connect to database. Aborting seed.');
      process.exit(1);
    }
    console.log('🌱 Starting database seed for Ethio Trip — Smart Multi-Operator Bus Ticketing System...');

    await Promise.all([
      Company.deleteMany({}),
      User.deleteMany({}),
      Bus.deleteMany({}),
      Route.deleteMany({}),
      Schedule.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Ticket.deleteMany({}),
      Discount.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({}),
      SupportTicket.deleteMany({}),
      ConductorReport.deleteMany({}),
    ]);
    console.log('🧹 Cleaned existing database collections');

    const companies = await Company.insertMany([
      {
        companyName: 'Selam Bus Line',
        licenseNumber: 'ETH-BUS-001',
        registrationNumber: 'REG-10021',
        tinNumber: '0012345678',
        phone: '0911223344',
        email: 'info@selambus.com',
        address: 'Meskel Square, Addis Ababa',
        city: 'Addis Ababa',
        logo: '/logos/selam_bus.png',
        description: 'Ethiopia premier luxury intercity coach transportation service with high-speed WiFi and AC.',
        status: 'active',
        rating: 4.9,
        totalReviews: 54,
        paymentMethods: {
          telebirr: { enabled: true, accountNumber: '0911223344' },
          cbe: { enabled: true, accountNumber: '1000123456789' },
          chapa: { enabled: true, accountNumber: 'CHAPA-ET-2026-LIVE' },
        },
        payment: { provider: 'CHAPA', enabled: true, mode: 'LIVE', splitType: 'percentage', splitValue: 90 },
      },
      {
        companyName: 'Sky Bus Line',
        licenseNumber: 'ETH-BUS-002',
        registrationNumber: 'REG-10022',
        tinNumber: '0087654321',
        phone: '0911778899',
        email: 'info@skybus.com',
        address: 'Kality Terminal, Addis Ababa',
        city: 'Addis Ababa',
        logo: '/logos/sky_bus.png',
        description: 'National intercity express transport serving core routes with modern luxury fleet.',
        status: 'active',
        rating: 4.7,
        totalReviews: 41,
        cancellationPolicy: { allowed: true, deadlineHours: 12, refundPercentage: 85 },
        paymentMethods: {
          telebirr: { enabled: true, accountNumber: '0911778899' },
          cbe: { enabled: true, accountNumber: '1000987654321' },
          chapa: { enabled: true, accountNumber: 'CHAPA-ET-2026-LIVE' },
        },
        payment: { provider: 'CHAPA', enabled: true, mode: 'LIVE', splitType: 'percentage', splitValue: 90 },
      },
      {
        companyName: 'Zemen Bus',
        licenseNumber: 'ETH-BUS-003',
        registrationNumber: 'REG-10023',
        tinNumber: '0034567890',
        phone: '0922334455',
        email: 'info@zemenbus.com',
        address: 'Autobis Tera, Addis Ababa',
        city: 'Addis Ababa',
        logo: '/logos/zemen_bus.png',
        description: 'Ultra-modern coaches with extra legroom, refreshments and entertainment.',
        status: 'active',
        rating: 4.8,
        totalReviews: 38,
        cancellationPolicy: { allowed: true, deadlineHours: 24, refundPercentage: 80 },
        paymentMethods: {
          telebirr: { enabled: true, accountNumber: '0922334455' },
          cbe: { enabled: true, accountNumber: '1000345678901' },
          chapa: { enabled: true, accountNumber: 'CHAPA-ET-2026-LIVE' },
        },
        payment: { provider: 'CHAPA', enabled: true, mode: 'LIVE', splitType: 'percentage', splitValue: 90 },
      },
      {
        companyName: 'Abay Bus',
        licenseNumber: 'ETH-BUS-004',
        registrationNumber: 'REG-10024',
        tinNumber: '0098765432',
        phone: '0933445566',
        email: 'info@abaybus.com',
        address: 'Bahir Dar Main Terminal, Bahir Dar',
        city: 'Bahir Dar',
        logo: '/logos/abay_bus.png',
        description: 'Reliable and safe passenger transportation across northern Ethiopia.',
        status: 'active',
        rating: 4.5,
        totalReviews: 29,
        cancellationPolicy: { allowed: true, deadlineHours: 48, refundPercentage: 75 },
        paymentMethods: {
          telebirr: { enabled: true, accountNumber: '0933445566' },
          cbe: { enabled: true, accountNumber: '1000567890123' },
          chapa: { enabled: true, accountNumber: 'CHAPA-ET-2026-LIVE' },
        },
        payment: { provider: 'CHAPA', enabled: true, mode: 'LIVE', splitType: 'percentage', splitValue: 90 },
      },
      {
        companyName: 'Habesha Bus',
        licenseNumber: 'ETH-BUS-005',
        registrationNumber: 'REG-10025',
        tinNumber: '0056789012',
        phone: '0944556677',
        email: 'info@habeshabus.com',
        address: 'Hawassa Terminal, Hawassa',
        city: 'Hawassa',
        logo: '/logos/habesha_bus.png',
        description: 'Connecting southern and central Ethiopian destinations with comfort.',
        status: 'active',
        rating: 4.6,
        totalReviews: 32,
        cancellationPolicy: { allowed: true, deadlineHours: 24, refundPercentage: 85 },
        paymentMethods: {
          telebirr: { enabled: true, accountNumber: '0944556677' },
          cbe: { enabled: true, accountNumber: '1000789012345' },
          chapa: { enabled: true, accountNumber: 'CHAPA-ET-2026-LIVE' },
        },
        payment: { provider: 'CHAPA', enabled: true, mode: 'LIVE', splitType: 'percentage', splitValue: 90 },
      },
    ]);
    console.log(`✅ Seeded ${companies.length} transport companies`);

    const rawUsers = [
      {
        name: 'Platform Admin',
        email: 'superadmin@ethiotrip.com',
        phone: '0911000000',
        password: 'SuperAdmin@2026',
        role: ROLES.SUPER_ADMIN,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Dawit (Selam Admin)',
        email: 'admin@selambus.com',
        phone: '0911111111',
        password: 'SelamAdmin@2026',
        role: ROLES.COMPANY_ADMIN,
        companyId: companies[0]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Tigist (Selam Staff)',
        email: 'staff@selambus.com',
        phone: '0911111112',
        password: 'SelamStaff@2026',
        role: ROLES.COMPANY_STAFF,
        companyId: companies[0]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Haile (Selam Conductor)',
        email: 'conductor@selambus.com',
        phone: '0911111113',
        password: 'SelamConductor@2026',
        role: ROLES.CONDUCTOR,
        companyId: companies[0]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Kassahun (Sky Bus Admin)',
        email: 'admin@skybus.com',
        phone: '0922222222',
        password: 'SkyAdmin@2026',
        role: ROLES.COMPANY_ADMIN,
        companyId: companies[1]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Biniyam (Sky Bus Staff)',
        email: 'staff@skybus.com',
        phone: '0922222223',
        password: 'SkyStaff@2026',
        role: ROLES.COMPANY_STAFF,
        companyId: companies[1]._id,
        city: 'Bahir Dar',
        isEmailVerified: true,
      },
      {
        name: 'Solomon (Sky Bus Conductor)',
        email: 'conductor@skybus.com',
        phone: '0922222224',
        password: 'SkyConductor@2026',
        role: ROLES.CONDUCTOR,
        companyId: companies[1]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Bethlehem (Zemen Admin)',
        email: 'admin@zemenbus.com',
        phone: '0933333333',
        password: 'ZemenAdmin@2026',
        role: ROLES.COMPANY_ADMIN,
        companyId: companies[2]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Henok (Zemen Conductor)',
        email: 'conductor@zemenbus.com',
        phone: '0933333335',
        password: 'ZemenConductor@2026',
        role: ROLES.CONDUCTOR,
        companyId: companies[2]._id,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
      {
        name: 'Tewodros (Abay Admin)',
        email: 'admin@abaybus.com',
        phone: '0944444444',
        password: 'AbayAdmin@2026',
        role: ROLES.COMPANY_ADMIN,
        companyId: companies[3]._id,
        city: 'Bahir Dar',
        isEmailVerified: true,
      },
      {
        name: 'Yonas (Abay Conductor)',
        email: 'conductor@abaybus.com',
        phone: '0944444446',
        password: 'AbayConductor@2026',
        role: ROLES.CONDUCTOR,
        companyId: companies[3]._id,
        city: 'Bahir Dar',
        isEmailVerified: true,
      },
      {
        name: 'Almaz (Habesha Admin)',
        email: 'admin@habeshabus.com',
        phone: '0955555555',
        password: 'HabeshaAdmin@2026',
        role: ROLES.COMPANY_ADMIN,
        companyId: companies[4]._id,
        city: 'Hawassa',
        isEmailVerified: true,
      },
      {
        name: 'Girma (Habesha Conductor)',
        email: 'conductor@habeshabus.com',
        phone: '0955555557',
        password: 'HabeshaConductor@2026',
        role: ROLES.CONDUCTOR,
        companyId: companies[4]._id,
        city: 'Hawassa',
        isEmailVerified: true,
      },
      {
        name: 'Samuel Passenger',
        email: 'passenger@example.com',
        phone: '0966666666',
        password: 'Passenger@2026',
        role: ROLES.PASSENGER,
        city: 'Addis Ababa',
        isEmailVerified: true,
      },
    ];

    const users = [];
    for (const u of rawUsers) {
      const created = await User.create(u);
      users.push(created);
    }
    console.log(`✅ Seeded ${users.length} canonical role users`);

    const buses = await Bus.insertMany([
      {
        companyId: companies[0]._id,
        busNumber: 'Selam Scania Luxury 01',
        plateNumber: '3-A10101-ET',
        type: 'VIP',
        capacity: 45,
        amenities: ['Air Conditioning', 'High-Speed WiFi', 'USB Charging', 'Water', 'TV Entertainment'],
        description: 'Flagship European-standard Scania touring coach.',
        image: '/images/selam_bus.png',
        status: 'active',
      },
      {
        companyId: companies[1]._id,
        busNumber: 'Sky Bus Express 01',
        plateNumber: '3-B20202-ET',
        type: 'Executive',
        capacity: 45,
        amenities: ['Air Conditioning', 'WiFi', 'USB Charging', 'Water'],
        description: 'Modern long-distance executive coach.',
        image: '/images/sky_bus_real.webp',
        status: 'active',
      },
      {
        companyId: companies[2]._id,
        busNumber: 'Zemen Golden Star',
        plateNumber: '3-C30303-ET',
        type: 'VIP',
        capacity: 40,
        amenities: ['Extra Legroom', 'WiFi', 'AC', 'Refreshments', 'Entertainment'],
        description: 'First-class luxury travel liner.',
        image: '/images/zemen_bus.png',
        status: 'active',
      },
      {
        companyId: companies[3]._id,
        busNumber: 'Abay Northern Express',
        plateNumber: '3-D40404-ET',
        type: 'Standard',
        capacity: 45,
        amenities: ['Air Conditioning', 'Water', 'Comfort Seats'],
        description: 'Sturdy long-distance coach for northern highlands.',
        image: '/images/abay_bus.png',
        status: 'active',
      },
      {
        companyId: companies[4]._id,
        busNumber: 'Habesha Southern Liner',
        plateNumber: '3-E50505-ET',
        type: 'Luxury',
        capacity: 45,
        amenities: ['Air Conditioning', 'USB Charging', 'Water', 'TV'],
        description: 'Habesha Southern regional luxury coach.',
        image: '/images/habesha_bus.png',
        status: 'active',
      },
    ]);
    console.log(`✅ Seeded ${buses.length} distinct buses`);

    const routes = await Route.insertMany([
      {
        companyId: companies[0]._id,
        from: 'Addis Ababa',
        to: 'Bahir Dar',
        distance: 578,
        duration: '9 hours',
        stops: ['Debre Markos'],
        status: 'active',
      },
      {
        companyId: companies[0]._id,
        from: 'Bahir Dar',
        to: 'Addis Ababa',
        distance: 578,
        duration: '9 hours',
        stops: ['Debre Markos'],
        status: 'active',
      },
      {
        companyId: companies[0]._id,
        from: 'Addis Ababa',
        to: 'Hawassa',
        distance: 273,
        duration: '4 hours',
        stops: ['Bishoftu', 'Mojo'],
        status: 'active',
      },
      {
        companyId: companies[1]._id,
        from: 'Addis Ababa',
        to: 'Bahir Dar',
        distance: 578,
        duration: '8.5 hours',
        stops: ['Debre Markos'],
        status: 'active',
      },
      {
        companyId: companies[1]._id,
        from: 'Addis Ababa',
        to: 'Dire Dawa',
        distance: 515,
        duration: '8 hours',
        stops: ['Adama', 'Awash'],
        status: 'active',
      },
    ]);
    console.log(`✅ Seeded ${routes.length} intercity routes`);

    const selamConductor = users.find((u) => u.email === 'conductor@selambus.com');
    const skyConductor = users.find((u) => u.email === 'conductor@skybus.com');

    const scheduleData = [
      {
        tripId: 'TRP-1001',
        companyId: companies[0]._id,
        bus: buses[0]._id,
        route: routes[0]._id,
        date: getFutureDate(0),
        departureTime: '06:00 AM',
        arrivalTime: '03:00 PM',
        price: 950,
        availableSeats: 43,
        bookedSeats: ['1', '2'],
        assignedConductor: selamConductor?._id,
        status: 'scheduled',
      },
      {
        tripId: 'TRP-1002',
        companyId: companies[1]._id,
        bus: buses[1]._id,
        route: routes[3]._id,
        date: getFutureDate(0),
        departureTime: '07:00 AM',
        arrivalTime: '03:30 PM',
        price: 980,
        availableSeats: 43,
        bookedSeats: ['3', '4'],
        assignedConductor: skyConductor?._id,
        status: 'scheduled',
      },
      {
        tripId: 'TRP-2001',
        companyId: companies[0]._id,
        bus: buses[0]._id,
        route: routes[0]._id,
        date: getFutureDate(1),
        departureTime: '06:00 AM',
        arrivalTime: '03:00 PM',
        price: 950,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: selamConductor?._id,
        status: 'scheduled',
      },
    ];

    const schedules = await Schedule.insertMany(scheduleData);
    console.log(`✅ Seeded ${schedules.length} schedules with assigned conductors`);

    const demoPassenger = users.find((u) => u.email === 'passenger@example.com');
    const primarySchedule = schedules[0];

    const demoBooking = await Booking.create({
      companyId: companies[0]._id,
      ticketNumber: 'ETH-891021-4401',
      schedule: primarySchedule._id,
      passenger: {
        name: demoPassenger.name,
        phone: demoPassenger.phone,
        email: demoPassenger.email,
        gender: 'Male',
        age: '28',
      },
      user: demoPassenger._id,
      selectedSeats: ['1'],
      baseFare: 950,
      totalPrice: 950,
      tripType: 'oneway',
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      outboundLeg: {
        schedule: primarySchedule._id,
        bus: buses[0]._id,
        route: routes[0]._id,
        date: primarySchedule.date,
        departureTime: primarySchedule.departureTime,
        seats: ['1'],
        price: 950,
        status: 'CONFIRMED',
      },
    });

    const demoPayment = await Payment.create({
      companyId: companies[0]._id,
      booking: demoBooking._id,
      user: demoPassenger._id,
      amount: 950,
      currency: 'ETB',
      paymentMethod: 'Chapa',
      txRef: 'BUS-SEED-PAYMENT-001',
      transactionId: 'BUS-SEED-PAYMENT-001',
      chapaReference: 'CHAPA-DEMO-SEED-REF',
      status: PAYMENT_STATUS.PAID,
      paidAt: new Date(),
    });

    const demoTicket = await Ticket.create({
      ticketNumber: 'TKT-891021-1-321',
      companyId: companies[0]._id,
      booking: demoBooking._id,
      user: demoPassenger._id,
      schedule: primarySchedule._id,
      tripId: primarySchedule.tripId,
      legType: 'oneway',
      passengerName: demoPassenger.name,
      passengerPhone: demoPassenger.phone,
      passengerEmail: demoPassenger.email,
      seatNumber: '1',
      price: 950,
      busCompany: 'Selam Bus Line',
      companyName: 'Selam Bus Line',
      route: 'Addis Ababa → Bahir Dar',
      from: 'Addis Ababa',
      to: 'Bahir Dar',
      travelDate: primarySchedule.date,
      departureTime: primarySchedule.departureTime,
      qrCode: `ETHIOTRIP:TKT-891021-1-321:${primarySchedule.tripId}:1:${demoPassenger.name}`,
      status: TICKET_STATUS.ACTIVE,
      verificationStatus: 'VERIFIED',
      boardingStatus: BOARDING_STATUS.NOT_BOARDED,
    });
    console.log(`✅ Seeded demo confirmed booking & active ticket with ETHIOTRIP QR code`);

    const discounts = await Discount.insertMany([
      {
        companyId: companies[0]._id,
        code: 'ROUNDTRIP10',
        name: 'Selam 10% Round-Trip Saver',
        discountType: 'percentage',
        discountValue: 10,
        tripType: 'round',
        minAmount: 500,
        isActive: true,
      },
      {
        companyId: companies[1]._id,
        code: 'ROUNDTRIP10',
        name: 'Sky Bus Round-Trip Saver',
        discountType: 'percentage',
        discountValue: 10,
        tripType: 'round',
        minAmount: 500,
        isActive: true,
      },
    ]);
    console.log(`✅ Seeded ${discounts.length} company discounts`);

    const superAdminUser = await User.findOne({ email: 'superadmin@ethiotrip.com' });
    const selamAdminUser = await User.findOne({ email: 'admin@selambus.com' });
    const selamStaffUser = await User.findOne({ email: 'staff@selambus.com' });
    const nowTime = new Date();

    await AuditLog.insertMany([
      {
        user: superAdminUser?._id,
        userEmail: 'superadmin@ethiotrip.com',
        userRole: 'super_admin',
        companyName: 'Platform Wide',
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: superAdminUser?._id?.toString() || 'SA-01',
        details: {
          role: 'super_admin',
          name: 'Platform Admin',
          email: 'superadmin@ethiotrip.com',
          loginTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          ip: '197.156.104.2',
          device: 'Chrome / Windows',
        },
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        user: selamAdminUser?._id,
        userEmail: 'admin@selambus.com',
        userRole: 'company_admin',
        companyId: companies[0]._id,
        companyName: 'Selam Bus Line',
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: selamAdminUser?._id?.toString() || 'CA-01',
        details: {
          role: 'company_admin',
          name: 'Dawit (Selam Admin)',
          email: 'admin@selambus.com',
          loginTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          ip: '197.156.104.8',
          device: 'Edge / Windows',
        },
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        user: selamStaffUser?._id,
        userEmail: 'staff@selambus.com',
        userRole: 'company_staff',
        companyId: companies[0]._id,
        companyName: 'Selam Bus Line',
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: selamStaffUser?._id?.toString() || 'CS-01',
        details: {
          role: 'company_staff',
          name: 'Almaz (Selam Staff)',
          email: 'staff@selambus.com',
          loginTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          ip: '197.156.104.12',
          device: 'Firefox / Windows',
        },
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        user: superAdminUser?._id,
        userEmail: 'superadmin@ethiotrip.com',
        userRole: 'super_admin',
        companyId: companies[0]._id,
        companyName: 'Selam Bus Line',
        action: 'COMPANY_APPROVED',
        entityType: 'Company',
        entityId: companies[0]._id.toString(),
        details: {
          companyName: 'Selam Bus Line',
          paymentMethods: ['Telebirr', 'CBE Bank', 'Chapa'],
          approvedAt: nowTime.toISOString(),
        },
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        user: selamStaffUser?._id,
        userEmail: 'staff@selambus.com',
        userRole: 'company_staff',
        companyId: companies[0]._id,
        companyName: 'Selam Bus Line',
        action: 'COUNTER_BOOKING_ISSUED',
        entityType: 'Booking',
        entityId: 'ETH-891021',
        details: {
          ticketNumber: 'ETH-891021',
          paymentStatus: 'PAID',
          paymentMethod: 'Cash',
          amount: 950,
          passengerName: 'Abebe Kebede',
        },
        createdAt: new Date(Date.now() - 3 * 3600 * 1000),
      },
    ]);
    console.log('✅ Seeded platform audit logs with user login timestamps and system activities');

    console.log('\n========================================================================');
    console.log('🎉 ETHIO TRIP MULTI-OPERATOR SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('Platform: Ethio Trip — Smart Multi-Operator Bus Ticketing & Management System');
    console.log('Operators: Selam Bus Line, Sky Bus Line, Zemen Bus, Abay Bus, Habesha Bus');
    console.log('\nRole-Specific Credentials:');
    console.log('  1. Super Admin:          superadmin@ethiotrip.com  / Password: SuperAdmin@2026');
    console.log('  2. Selam Bus Admin:      admin@selambus.com        / Password: SelamAdmin@2026');
    console.log('     Selam Company Staff:  staff@selambus.com        / Password: SelamStaff@2026');
    console.log('     Selam Conductor:      conductor@selambus.com    / Password: SelamConductor@2026');
    console.log('  3. Sky Bus Admin:        admin@skybus.com          / Password: SkyAdmin@2026');
    console.log('     Sky Bus Staff:        staff@skybus.com          / Password: SkyStaff@2026');
    console.log('     Sky Bus Conductor:    conductor@skybus.com      / Password: SkyConductor@2026');
    console.log('  4. Zemen Bus Admin:      admin@zemenbus.com        / Password: ZemenAdmin@2026');
    console.log('     Zemen Conductor:      conductor@zemenbus.com    / Password: ZemenConductor@2026');
    console.log('  5. Abay Bus Admin:       admin@abaybus.com         / Password: AbayAdmin@2026');
    console.log('     Abay Conductor:       conductor@abaybus.com     / Password: AbayConductor@2026');
    console.log('  6. Habesha Bus Admin:    admin@habeshabus.com      / Password: HabeshaAdmin@2026');
    console.log('     Habesha Conductor:    conductor@habeshabus.com  / Password: HabeshaConductor@2026');
    console.log('  7. Demo Passenger:       passenger@example.com     / Password: Passenger@2026');
    console.log('========================================================================\n');

    if (require.main === module) {
      process.exit(0);
    }
    return { success: true };
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
