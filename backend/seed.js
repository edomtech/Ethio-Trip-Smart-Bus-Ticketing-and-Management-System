const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Models
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

dotenv.config();

const getFutureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting comprehensive database seed for Smart Bus Ticketing System...');

    // Clear existing collections
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

    // 1. Create Transport Companies
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
        description: 'Ethiopia’s premier luxury intercity coach transportation service with high-speed WiFi and AC.',
        status: 'active',
        rating: 4.9,
        totalReviews: 54,
        cancellationPolicy: { allowed: true, deadlineHours: 24, refundPercentage: 90 },
      },
      {
        companyName: 'Ethio Bus',
        licenseNumber: 'ETH-BUS-002',
        registrationNumber: 'REG-10022',
        tinNumber: '0087654321',
        phone: '0911778899',
        email: 'info@ethiobus.com',
        address: 'Kality Terminal, Addis Ababa',
        city: 'Addis Ababa',
        logo: '/logos/ethio_bus.png',
        description: 'National intercity express transport serving core routes with modern luxury fleet.',
        status: 'active',
        rating: 4.7,
        totalReviews: 41,
        cancellationPolicy: { allowed: true, deadlineHours: 12, refundPercentage: 85 },
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
      },
    ]);
    console.log(`✅ Seeded ${companies.length} transport companies`);

    // 2. Create System Users (Admins, Agents, Conductors, Passenger)
    const rawUsers = [
      // Super Admin
      {
        name: 'Ethio Trip Super Admin',
        email: 'superadmin@ethiotrip.com',
        phone: '0900000000',
        password: 'password123',
        role: 'super_admin',
        city: 'Addis Ababa',
      },
      // 1. Selam Bus
      {
        name: 'Alemayehu',
        email: 'admin@selambus.com',
        phone: '0911111111',
        password: 'password123',
        role: 'company_admin',
        companyId: companies[0]._id,
        city: 'Addis Ababa',
      },
      {
        name: 'Tigist',
        email: 'staff@selambus.com',
        phone: '0911111112',
        password: 'password123',
        role: 'agent',
        companyId: companies[0]._id,
        city: 'Addis Ababa',
      },
      {
        name: 'Dawit',
        email: 'conductor@selambus.com',
        phone: '0911111113',
        password: 'password123',
        role: 'conductor',
        companyId: companies[0]._id,
        city: 'Addis Ababa',
      },
      // 2. Ethio Bus
      {
        name: 'Kassahun ',
        email: 'admin@ethiobus.com',
        phone: '0922222222',
        password: 'password123',
        role: 'company_admin',
        companyId: companies[1]._id,
        city: 'Addis Ababa',
      },
      {
        name: 'Biniyam ',
        email: 'staff@ethiobus.com',
        phone: '0922222223',
        password: 'password123',
        role: 'agent',
        companyId: companies[1]._id,
        city: 'Bahir Dar',
      },
      {
        name: 'Solomon ',
        email: 'conductor@ethiobus.com',
        phone: '0922222224',
        password: 'password123',
        role: 'conductor',
        companyId: companies[1]._id,
        city: 'Addis Ababa',
      },
      // 3. Zemen Bus
      {
        name: 'Bethlehem',
        email: 'admin@zemenbus.com',
        phone: '0933333333',
        password: 'password123',
        role: 'company_admin',
        companyId: companies[2]._id,
        city: 'Addis Ababa',
      },
      {
        name: 'Yared',
        email: 'staff@zemenbus.com',
        phone: '0933333334',
        password: 'password123',
        role: 'agent',
        companyId: companies[2]._id,
        city: 'Mekelle',
      },
      {
        name: 'Henok',
        email: 'conductor@zemenbus.com',
        phone: '0933333335',
        password: 'password123',
        role: 'conductor',
        companyId: companies[2]._id,
        city: 'Addis Ababa',
      },
      // 4. Abay Bus
      {
        name: 'Tewodros ',
        email: 'admin@abaybus.com',
        phone: '0944444444',
        password: 'password123',
        role: 'company_admin',
        companyId: companies[3]._id,
        city: 'Bahir Dar',
      },
      {
        name: 'Mesfin',
        email: 'staff@abaybus.com',
        phone: '0944444445',
        password: 'password123',
        role: 'agent',
        companyId: companies[3]._id,
        city: 'Gondar',
      },
      {
        name: 'Mulugeta',
        email: 'conductor@abaybus.com',
        phone: '0944444446',
        password: 'password123',
        role: 'conductor',
        companyId: companies[3]._id,
        city: 'Bahir Dar',
      },
      // 5. Habesha Bus
      {
        name: 'Hiwot (Habesha Admin)',
        email: 'admin@habeshabus.com',
        phone: '0955555555',
        password: 'password123',
        role: 'company_admin',
        companyId: companies[4]._id,
        city: 'Hawassa',
      },
      {
        name: 'Fikadu (Habesha Agent)',
        email: 'staff@habeshabus.com',
        phone: '0955555556',
        password: 'password123',
        role: 'agent',
        companyId: companies[4]._id,
        city: 'Jimma',
      },
      {
        name: 'Natnael (Habesha Conductor)',
        email: 'conductor@habeshabus.com',
        phone: '0955555557',
        password: 'password123',
        role: 'conductor',
        companyId: companies[4]._id,
        city: 'Hawassa',
      },
      // Public Passenger
      {
        name: 'Samuel Passenger',
        email: 'passenger@example.com',
        phone: '0966666666',
        password: 'password123',
        role: 'passenger',
        city: 'Addis Ababa',
      },
    ];

    const users = [];
    for (const u of rawUsers) {
      const created = await User.create({ ...u, isEmailVerified: true });
      users.push(created);
    }
    console.log(`✅ Seeded ${users.length} users with password 'password123'`);

    // 3. Create Buses
    const buses = await Bus.insertMany([
      {
        companyId: companies[0]._id,
        busNumber: 'Selam Luxury Coach (VIP-01)',
        plateNumber: '3-A10101-ET',
        type: 'VIP',
        capacity: 45,
        amenities: ['WiFi', 'Air Conditioning', 'Leather Recliner', 'Snacks', 'USB Charging', 'TV'],
        description: 'Flagship executive coach for premier comfort on long distance routes.',
        image: '/images/selam_bus.png',
        status: 'active',
      },
      {
        companyId: companies[1]._id,
        busNumber: 'Ethio Express Liner',
        plateNumber: '3-B20202-ET',
        type: 'Luxury',
        capacity: 45,
        amenities: ['Air Conditioning', 'WiFi', 'USB Charging', 'Water'],
        description: 'Ethio Bus national express intercity liner.',
        image: '/images/ethio_bus.png',
        status: 'active',
      },
      {
        companyId: companies[2]._id,
        busNumber: 'Zemen Star Executive',
        plateNumber: '3-C30303-ET',
        type: 'VIP',
        capacity: 45,
        amenities: ['WiFi', 'Air Conditioning', 'Coffee/Tea', 'USB Charging', 'Extra Legroom'],
        description: 'Zemen high-end VIP intercity coach with premium hospitality.',
        image: '/images/zemen_bus.png',
        status: 'active',
      },
      {
        companyId: companies[3]._id,
        busNumber: 'Abay Standard Express',
        plateNumber: '3-D40404-ET',
        type: 'Standard',
        capacity: 45,
        amenities: ['Air Conditioning', 'Water', 'USB Charging'],
        description: 'Abay Express northern passenger liner.',
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

    // 4. Create Routes
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
        from: 'Bahir Dar',
        to: 'Addis Ababa',
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
      {
        companyId: companies[2]._id,
        from: 'Addis Ababa',
        to: 'Mekelle',
        distance: 783,
        duration: '12 hours',
        stops: ['Dessie', 'Woldia'],
        status: 'active',
      },
      {
        companyId: companies[3]._id,
        from: 'Addis Ababa',
        to: 'Gondar',
        distance: 738,
        duration: '11 hours',
        stops: ['Debre Birhan', 'Debre Markos'],
        status: 'active',
      },
      {
        companyId: companies[4]._id,
        from: 'Addis Ababa',
        to: 'Hawassa',
        distance: 273,
        duration: '4 hours',
        stops: ['Bishoftu', 'Mojo'],
        status: 'active',
      },
    ]);
    console.log(`✅ Seeded ${routes.length} routes for all 5 companies`);

    // Conductor references
    const selamConductor = users.find(u => u.email === 'conductor@selambus.com');
    const ethioConductor = users.find(u => u.email === 'conductor@ethiobus.com');
    const zemenConductor = users.find(u => u.email === 'conductor@zemenbus.com');
    const abayConductor = users.find(u => u.email === 'conductor@abaybus.com');
    const habeshaConductor = users.find(u => u.email === 'conductor@habeshabus.com');

    // 5. Create Schedules with Unique Trip IDs & Assigned Conductors
    const scheduleData = [
      // Today schedules
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
        bookedSeats: ['Seat 1', 'Seat 2'],
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
        bookedSeats: ['Seat 3', 'Seat 4'],
        assignedConductor: ethioConductor?._id,
        status: 'scheduled',
      },
      // Tomorrow Outbound schedules
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
      {
        tripId: 'TRP-2002',
        companyId: companies[1]._id,
        bus: buses[1]._id,
        route: routes[3]._id,
        date: getFutureDate(1),
        departureTime: '07:00 AM',
        arrivalTime: '03:30 PM',
        price: 980,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: ethioConductor?._id,
        status: 'scheduled',
      },
      // Return schedules (in 3 days)
      {
        tripId: 'TRP-3001',
        companyId: companies[0]._id,
        bus: buses[0]._id,
        route: routes[1]._id, // Bahir Dar -> Addis Ababa
        date: getFutureDate(3),
        departureTime: '06:00 AM',
        arrivalTime: '03:00 PM',
        price: 950,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: selamConductor?._id,
        status: 'scheduled',
      },
      {
        tripId: 'TRP-3002',
        companyId: companies[1]._id,
        bus: buses[1]._id,
        route: routes[4]._id, // Bahir Dar -> Addis Ababa
        date: getFutureDate(3),
        departureTime: '07:00 AM',
        arrivalTime: '03:30 PM',
        price: 980,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: ethioConductor?._id,
        status: 'scheduled',
      },
      // Other routes
      {
        tripId: 'TRP-2003',
        companyId: companies[2]._id,
        bus: buses[2]._id,
        route: routes[6]._id,
        date: getFutureDate(1),
        departureTime: '05:00 AM',
        arrivalTime: '05:00 PM',
        price: 1100,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: zemenConductor?._id,
        status: 'scheduled',
      },
      {
        tripId: 'TRP-2004',
        companyId: companies[3]._id,
        bus: buses[3]._id,
        route: routes[7]._id,
        date: getFutureDate(1),
        departureTime: '05:30 AM',
        arrivalTime: '04:30 PM',
        price: 850,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: abayConductor?._id,
        status: 'scheduled',
      },
      {
        tripId: 'TRP-2005',
        companyId: companies[4]._id,
        bus: buses[4]._id,
        route: routes[8]._id,
        date: getFutureDate(1),
        departureTime: '08:00 AM',
        arrivalTime: '12:00 PM',
        price: 650,
        availableSeats: 45,
        bookedSeats: [],
        assignedConductor: habeshaConductor?._id,
        status: 'scheduled',
      },
    ];

    const schedules = await Schedule.insertMany(scheduleData);
    console.log(`✅ Seeded ${schedules.length} schedules with unique Trip IDs and Assigned Conductors`);

    // 6. Create Discounts
    const discounts = await Discount.insertMany([
      {
        companyId: companies[0]._id,
        code: 'ROUNDTRIP10',
        name: 'Selam 10% Round-Trip Discount',
        discountType: 'percentage',
        discountValue: 10,
        tripType: 'round',
        minAmount: 500,
        isActive: true,
      },
      {
        companyId: companies[0]._id,
        code: 'SELAMVIP',
        name: 'VIP Traveler Discount',
        discountType: 'fixed',
        discountValue: 100,
        tripType: 'all',
        minAmount: 800,
        isActive: true,
      },
      {
        companyId: companies[1]._id,
        code: 'ROUNDTRIP10',
        name: 'Ethio Bus Round-Trip Saver',
        discountType: 'percentage',
        discountValue: 10,
        tripType: 'round',
        minAmount: 500,
        isActive: true,
      },
    ]);
    console.log(`✅ Seeded ${discounts.length} company promotional & round-trip discounts`);

    // 7. Create Support Conversations
    const supportTickets = await SupportTicket.insertMany([
      {
        companyId: companies[0]._id, // Selam Bus
        user: users[users.length - 1]._id, // Samuel Passenger
        passengerName: 'Samuel Passenger',
        passengerEmail: 'passenger@example.com',
        passengerPhone: '0966666666',
        subject: 'How can I cancel my ticket?',
        category: 'Cancellation & Refund',
        description: 'How can I cancel my ticket and what is the refund percentage for Selam Bus?',
        status: 'ANSWERED',
        priority: 'medium',
        respondedBy: users[2]._id, // Selam Ticket Agent
        respondedAt: new Date(),
        feedbackResponse: 'You can request cancellation directly from your Passenger Dashboard under the Cancellation & Refund tab. Selam Bus refunds 90% if cancelled at least 24 hours before departure.',
        messages: [
          {
            senderId: users[users.length - 1]._id,
            senderName: 'Samuel Passenger',
            senderRole: 'passenger',
            message: 'How can I cancel my ticket and what is the refund percentage for Selam Bus?',
            createdAt: new Date(Date.now() - 3600000 * 2),
          },
          {
            senderId: users[2]._id,
            senderName: 'Tigist (Selam Ticket Agent)',
            senderRole: 'agent',
            message: 'You can request cancellation directly from your Passenger Dashboard under the Cancellation & Refund tab. Selam Bus refunds 90% if cancelled at least 24 hours before departure.',
            createdAt: new Date(Date.now() - 3600000 * 1),
          },
        ],
      },
      {
        companyId: companies[1]._id, // Ethio Bus
        user: users[users.length - 1]._id,
        passengerName: 'Samuel Passenger',
        passengerEmail: 'passenger@example.com',
        passengerPhone: '0966666666',
        subject: 'Luggage Weight Limit Inquiry',
        category: 'Luggage / Lost Item',
        description: 'What is the maximum allowed baggage weight for the morning express?',
        status: 'OPEN',
        priority: 'low',
        messages: [
          {
            senderId: users[users.length - 1]._id,
            senderName: 'Samuel Passenger',
            senderRole: 'passenger',
            message: 'What is the maximum allowed baggage weight for the morning express?',
            createdAt: new Date(Date.now() - 1800000),
          },
        ],
      },
    ]);
    console.log(`✅ Seeded ${supportTickets.length} support conversation threads`);

    // 8. Create Conductor Reports
    const reports = await ConductorReport.insertMany([
      {
        companyId: companies[0]._id, // Selam Bus
        conductorId: users[3]._id, // Selam Conductor
        scheduleId: schedules[0]._id,
        tripId: schedules[0].tripId,
        busId: buses[0]._id,
        passengerName: 'Abebe Kebede',
        ticketNumber: 'TKT-891021-04-321',
        category: 'Seat mismatch',
        description: 'Passenger sat in Seat 04 instead of booked Seat 12, resolved peacefully after checking manifest.',
        status: 'RESOLVED',
        resolutionNotes: 'Conductor assisted passenger in relocating to correct assigned seat before departure.',
        resolvedBy: users[1]._id, // Selam Admin
        resolvedAt: new Date(),
      },
      {
        companyId: companies[0]._id, // Selam Bus
        conductorId: users[3]._id, // Selam Conductor
        scheduleId: schedules[0]._id,
        tripId: schedules[0].tripId,
        busId: buses[0]._id,
        passengerName: 'Marta Hailu',
        ticketNumber: 'TKT-992104-09-881',
        category: 'Ticket problem',
        description: 'Passenger presented digital ticket on phone with low battery; verified ticket number against printed manifest.',
        status: 'OPEN',
      },
    ]);
    console.log(`✅ Seeded ${reports.length} conductor problem reports`);

    console.log('\n========================================================================');
    console.log('🎉 ETHIO TRIP MULTI-COMPANY SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('Registered Companies: Selam Bus Line, Ethio Bus, Zemen Bus, Abay Bus, Habesha Bus');
    console.log('\nTest Accounts Credentials (Password: password123):');
    console.log('  1. Super Admin:          superadmin@ethiotrip.com');
    console.log('  2. Selam Bus Admin:      admin@selambus.com');
    console.log('     Selam Ticket Agent:   staff@selambus.com');
    console.log('     Selam Conductor:      conductor@selambus.com');
    console.log('  3. Ethio Bus Admin:      admin@ethiobus.com');
    console.log('     Ethio Ticket Agent:   staff@ethiobus.com');
    console.log('     Ethio Conductor:      conductor@ethiobus.com');
    console.log('  4. Zemen Bus Admin:      admin@zemenbus.com');
    console.log('     Zemen Conductor:      conductor@zemenbus.com');
    console.log('  5. Abay Bus Admin:       admin@abaybus.com');
    console.log('  6. Habesha Bus Admin:    admin@habeshabus.com');
    console.log('  7. Passenger Account:    passenger@example.com');
    console.log('========================================================================\n');

    if (require.main === module) {
      process.exit(0);
    }
    return { success: true, companiesSeeded: companies.length, busesSeeded: buses.length };
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
