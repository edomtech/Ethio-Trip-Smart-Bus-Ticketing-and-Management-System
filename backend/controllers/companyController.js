const Company = require('../models/Company');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// @desc    Register a new transport company (Public application)
// @route   POST /api/companies/register
// @access  Public
const registerCompany = async (req, res, next) => {
  try {
    const {
      companyName,
      licenseNumber,
      registrationNumber,
      tinNumber,
      phone,
      email,
      address,
      city,
      description,
      logo,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
    } = req.body;

    // Check if company already exists
    const existingCompany = await Company.findOne({
      $or: [{ companyName }, { licenseNumber }, { email }],
    });
    if (existingCompany) {
      return res.status(400).json({
        message: 'A company with this name, license number, or email already exists.',
      });
    }

    // Check if admin user email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User account with this admin email already exists.' });
    }

    // Create Company in PENDING status
    const company = await Company.create({
      companyName,
      licenseNumber,
      registrationNumber,
      tinNumber,
      phone,
      email,
      address,
      city: city || 'Addis Ababa',
      logo: logo || '',
      description: description || '',
      status: 'pending',
    });

    // Create Company Admin User
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone || phone,
      password: adminPassword,
      role: 'company_admin',
      companyId: company._id,
      city: city || 'Addis Ababa',
    });

    // Create Audit Log
    await AuditLog.create({
      user: adminUser._id,
      userEmail: adminUser.email,
      userRole: 'company_admin',
      companyId: company._id,
      companyName: company.companyName,
      action: 'COMPANY_REGISTERED',
      entityType: 'Company',
      entityId: company._id.toString(),
      details: { companyName, licenseNumber },
    });

    res.status(201).json({
      success: true,
      message: 'Company registration submitted successfully! Pending Super Admin review.',
      company,
      adminUser: adminUser.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all companies (with status filtering)
// @route   GET /api/companies
// @access  Public / Super Admin
const getCompanies = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const companies = await Company.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: companies.length, companies });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public active companies list (for search dropdowns and filters)
// @route   GET /api/companies/active
// @access  Public
const getActiveCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({ status: 'active' })
      .select('companyName logo rating totalReviews city description cancellationPolicy phone email')
      .sort({ companyName: 1 });
    res.json({ success: true, count: companies.length, companies });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single company details
// @route   GET /api/companies/:id
// @access  Private
const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

// @desc    Update company status (Approve, Reject, Suspend, Reactivate)
// @route   PATCH /api/companies/:id/status
// @access  Private (Super Admin)
const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['pending', 'active', 'suspended', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid company status value' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const prevStatus = company.status;
    company.status = status;
    await company.save();

    // Create Audit Log
    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId: company._id,
      companyName: company.companyName,
      action: `COMPANY_STATUS_CHANGED_${status.toUpperCase()}`,
      entityType: 'Company',
      entityId: company._id.toString(),
      details: { prevStatus, newStatus: status, reason },
    });

    // Notify Company Admins
    const companyAdmins = await User.find({ companyId: company._id, role: { $in: ['company_admin', 'admin'] } });
    for (const admin of companyAdmins) {
      await Notification.create({
        user: admin._id,
        companyId: company._id,
        type: 'company_status',
        title: `Company Status Updated: ${status.toUpperCase()}`,
        message: `Your transport company status has been updated from ${prevStatus} to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      });
    }

    res.json({
      success: true,
      message: `Company status successfully updated to ${status}`,
      company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update company profile (Company Admin)
// @route   PUT /api/companies/my-company
// @access  Private (Company Admin)
const updateCompanyProfile = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) return res.status(400).json({ message: 'User does not belong to a company' });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const allowedFields = [
      'companyName',
      'phone',
      'email',
      'address',
      'city',
      'logo',
      'description',
      'cancellationPolicy',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId: company._id,
      companyName: company.companyName,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'Company',
      entityId: company._id.toString(),
      details: req.body,
    });

    res.json({ success: true, message: 'Company profile updated successfully', company });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in user's company details
// @route   GET /api/companies/my-company
// @access  Private (Company Admin / Staff)
const getMyCompany = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) return res.status(400).json({ message: 'No company associated with user' });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerCompany,
  getCompanies,
  getActiveCompanies,
  getCompanyById,
  updateCompanyStatus,
  updateCompanyProfile,
  getMyCompany,
};
