const fs = require('fs');
const path = require('path');
const Bus = require('../models/Bus');
const Company = require('../models/Company');
const AuditLog = require('../models/AuditLog');

const COMPANY_BUS_IMAGES = {
  'Selam Bus Line': '/images/selam_bus.png',
  'Selam Bus': '/images/selam_bus.png',
  'Ethio Bus': '/images/ethio_bus.png',
  'Zemen Bus': '/images/zemen_bus.png',
  'Abay Bus': '/images/abay_bus.png',
  'Habesha Bus': '/images/habesha_bus.png',
};

const isSuper = (user) => user.role === 'super_admin' || (user.role === 'admin' && !user.companyId);
const getCompId = (user) => user.companyId?._id ? user.companyId._id.toString() : user.companyId ? user.companyId.toString() : null;

// @desc    Get all buses (Scoped by company unless Super Admin)
// @route   GET /api/buses
// @access  Private (Super Admin, Company Admin, Company Staff)
const getBuses = async (req, res, next) => {
  try {
    const query = {};
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'User is not assigned to a company' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const buses = await Bus.find(query).populate('companyId', 'companyName logo').sort('-createdAt');
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

// @desc    Get bus by ID
// @route   GET /api/buses/:id
// @access  Private
const getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('companyId', 'companyName logo');
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    // Multi-tenant authorization check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const busCompanyId = bus.companyId?._id ? bus.companyId._id.toString() : bus.companyId.toString();
      if (userCompanyId !== busCompanyId) {
        return res.status(403).json({ message: 'Access denied. Bus belongs to another company.' });
      }
    }

    res.json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private (Company Admin, Super Admin)
const createBus = async (req, res, next) => {
  try {
    let companyId;
    if (isSuper(req.user)) {
      companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ message: 'Company ID is required for Super Admin' });
    } else {
      companyId = getCompId(req.user);
    }

    if (!companyId) {
      return res.status(400).json({ message: 'Valid company ID is required to create a bus' });
    }

    let image = req.body.image;
    if (!image) {
      const comp = await Company.findById(companyId);
      if (comp && COMPANY_BUS_IMAGES[comp.companyName]) {
        image = COMPANY_BUS_IMAGES[comp.companyName];
      }
    }

    const bus = await Bus.create({
      ...req.body,
      plateNumber: (req.body.plateNumber || '').trim(),
      image: image || '/images/selam_bus.png',
      companyId,
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'BUS_CREATED',
      entityType: 'Bus',
      entityId: bus._id.toString(),
      details: { busNumber: bus.busNumber, plateNumber: bus.plateNumber, type: bus.type },
    });

    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private (Company Admin, Super Admin)
const updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const busCompanyId = bus.companyId.toString();
      if (userCompanyId !== busCompanyId) {
        return res.status(403).json({ message: 'Access denied. You cannot modify another company bus.' });
      }
    }

    Object.assign(bus, req.body);
    if (req.body.plateNumber !== undefined) {
      bus.plateNumber = req.body.plateNumber.trim();
    }
    await bus.save();

    res.json(bus);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete bus
// @route   DELETE /api/buses/:id
// @access  Private (Company Admin, Super Admin)
const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const busCompanyId = bus.companyId.toString();
      if (userCompanyId !== busCompanyId) {
        return res.status(403).json({ message: 'Access denied. You cannot delete another company bus.' });
      }
    }

    await bus.deleteOne();
    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active buses for active companies (Representative bus per company)
// @route   GET /api/buses/public
// @access  Public
const getPublicBuses = async (req, res, next) => {
  try {
    const activeCompanies = await Company.find({ status: 'active' }).select('_id');
    const activeCompanyIds = activeCompanies.map((c) => c._id);

    const buses = await Bus.find({
      companyId: { $in: activeCompanyIds },
      status: 'active',
    })
      .populate('companyId', 'companyName logo rating totalReviews description')
      .sort('-createdAt');

    for (const bus of buses) {
      const compName = bus.companyId?.companyName;
      if (!bus.image && compName && COMPANY_BUS_IMAGES[compName]) {
        bus.image = COMPANY_BUS_IMAGES[compName];
      }
    }

    res.json(buses);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getPublicBuses,
};
