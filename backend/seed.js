const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Schedule = require('./models/Schedule');

const connectDB = require('./config/db');

const getFutureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const seed = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Bus.deleteMany({}),
      Route.deleteMany({}),
      Schedule.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Users (Use User.create to trigger password hashing pre-save middleware)
    const rawUsers = [
      { name: 'System Admin',    email: 'admin@ethiobus.com',    phone: '0911223344', password: 'password123', role: 'admin',     city: 'Addis Ababa' },
      { name: 'Kebede Agent',    email: 'agent@ethiobus.com',    phone: '0911556677', password: 'password123', role: 'agent',     city: 'Bahir Dar'   },
      { name: 'Almaz Passenger', email: 'passenger@example.com', phone: '0911998877', password: 'password123', role: 'passenger', city: 'Hawassa'     },
    ];
    const users = [];
    for (const u of rawUsers) {
      const created = await User.create(u);
      users.push(created);
    }
    console.log(`Created ${users.length} users`);

    // Buses
    const buses = await Bus.insertMany([
      { busNumber: 'B001', plateNumber: 'AA-12345', type: 'Luxury',   capacity: 45, status: 'active' },
      { busNumber: 'B002', plateNumber: 'AA-67890', type: 'Standard', capacity: 50, status: 'active' },
      { busNumber: 'B003', plateNumber: 'AA-11223', type: 'VIP',      capacity: 35, status: 'active' },
      { busNumber: 'B004', plateNumber: 'AA-44556', type: 'Standard', capacity: 45, status: 'active' },
      { busNumber: 'B005', plateNumber: 'AA-55667', type: 'Luxury',   capacity: 40, status: 'active' },
      { busNumber: 'B006', plateNumber: 'AA-78901', type: 'VIP',      capacity: 30, status: 'active' },
    ]);
    console.log(`Created ${buses.length} buses`);

    // Routes
    const routes = await Route.insertMany([
      { from: 'Addis Ababa', to: 'Dire Dawa',  distance: 515, duration: '8 hours',  stops: ['Adama', 'Awash'],              status: 'active' },
      { from: 'Addis Ababa', to: 'Bahir Dar',  distance: 578, duration: '9 hours',  stops: ['Debre Markos'],               status: 'active' },
      { from: 'Addis Ababa', to: 'Hawassa',    distance: 273, duration: '4 hours',  stops: ['Bishoftu', 'Mojo'],           status: 'active' },
      { from: 'Addis Ababa', to: 'Jimma',      distance: 346, duration: '6 hours',  stops: ['Welkite'],                    status: 'active' },
      { from: 'Addis Ababa', to: 'Mekelle',    distance: 783, duration: '12 hours', stops: ['Dessie', 'Woldia'],           status: 'active' },
      { from: 'Addis Ababa', to: 'Gondar',     distance: 738, duration: '11 hours', stops: ['Debre Birhan', 'Debre Markos'], status: 'active' },
      { from: 'Addis Ababa', to: 'Dessie',     distance: 401, duration: '6 hours',  stops: ['Debre Birhan'],               status: 'active' },
      { from: 'Addis Ababa', to: 'Adama',      distance: 99,  duration: '2 hours',  stops: [],                             status: 'active' },
    ]);
    console.log(`Created ${routes.length} routes`);

    // Schedules
    const scheduleData = [
      { bus: buses[0], route: routes[0], date: getFutureDate(1), departureTime: '06:00 AM', arrivalTime: '02:00 PM', price: 700,  availableSeats: 45 },
      { bus: buses[1], route: routes[0], date: getFutureDate(1), departureTime: '09:00 AM', arrivalTime: '05:00 PM', price: 650,  availableSeats: 50 },
      { bus: buses[2], route: routes[1], date: getFutureDate(1), departureTime: '07:00 AM', arrivalTime: '04:00 PM', price: 750,  availableSeats: 35 },
      { bus: buses[3], route: routes[2], date: getFutureDate(1), departureTime: '08:00 AM', arrivalTime: '12:00 PM', price: 550,  availableSeats: 45 },
      { bus: buses[4], route: routes[3], date: getFutureDate(1), departureTime: '07:30 AM', arrivalTime: '01:30 PM', price: 600,  availableSeats: 40 },
      { bus: buses[5], route: routes[4], date: getFutureDate(2), departureTime: '06:00 AM', arrivalTime: '06:00 PM', price: 950,  availableSeats: 30 },
      { bus: buses[0], route: routes[5], date: getFutureDate(2), departureTime: '06:30 AM', arrivalTime: '05:30 PM', price: 900,  availableSeats: 45 },
      { bus: buses[1], route: routes[6], date: getFutureDate(2), departureTime: '08:00 AM', arrivalTime: '02:00 PM', price: 680,  availableSeats: 50 },
      { bus: buses[2], route: routes[7], date: getFutureDate(1), departureTime: '07:00 AM', arrivalTime: '09:00 AM', price: 320,  availableSeats: 35 },
      { bus: buses[3], route: routes[0], date: getFutureDate(3), departureTime: '06:00 AM', arrivalTime: '02:00 PM', price: 700,  availableSeats: 45 },
      { bus: buses[4], route: routes[2], date: getFutureDate(3), departureTime: '09:00 AM', arrivalTime: '01:00 PM', price: 550,  availableSeats: 40 },
      { bus: buses[5], route: routes[1], date: getFutureDate(3), departureTime: '07:00 AM', arrivalTime: '04:00 PM', price: 750,  availableSeats: 30 },
    ];

    const schedules = await Schedule.insertMany(scheduleData.map(s => ({
      ...s, bus: s.bus._id, route: s.route._id, bookedSeats: [], status: 'scheduled',
    })));
    console.log(`Created ${schedules.length} schedules`);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Test Accounts:');
    console.log('  Admin:     admin@ethiobus.com     / password123');
    console.log('  Agent:     agent@ethiobus.com     / password123');
    console.log('  Passenger: passenger@example.com  / password123\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
