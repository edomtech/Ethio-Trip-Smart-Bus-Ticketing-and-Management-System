const Company = require('../models/Company');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { ROLES } = require('../constants/roles');
const { sendCompanyApprovedEmail, sendCompanyRejectedEmail } = require('./emailService');


const createCompanyBySuperAdmin = async (companyData, superAdminUser) => {
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
    status,
    paymentMethods,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
    cancellationPolicy,
  } = companyData;

  if (!companyName || !licenseNumber || !tinNumber || !email) {
    const err = new Error('Company name, license number, TIN, and email are required');
    err.statusCode = 400;
    throw err;
  }

  if (!adminName || !adminEmail || !adminPassword) {
    const err = new Error('Company administrator name, email, and password are required');
    err.statusCode = 400;
    throw err;
  }

  const existingCompany = await Company.findOne({
    $or: [
      { companyName: companyName.trim() },
      { licenseNumber: licenseNumber.trim() },
      { email: email.toLowerCase().trim() },
    ],
  });

  if (existingCompany) {
    const err = new Error('A company with this name, license number, or email already exists.');
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingUser) {
    const err = new Error('A user account with this administrator email already exists.');
    err.statusCode = 400;
    throw err;
  }

  const companyStatus = (status === 'pending') ? 'pending'
    : (status === 'suspended') ? 'suspended'
    : 'active';

  const company = await Company.create({
    companyName: companyName.trim(),
    licenseNumber: licenseNumber.trim(),
    registrationNumber: (registrationNumber || '').trim(),
    tinNumber: tinNumber.trim(),
    phone: phone.trim(),
    email: email.toLowerCase().trim(),
    address: address.trim(),
    city: city || 'Addis Ababa',
    logo: logo || '',
    description: description || '',
    status: companyStatus,
    paymentMethods: paymentMethods || {
      telebirr: { enabled: true, accountNumber: '' },
      cbe: { enabled: true, accountNumber: '' },
      chapa: { enabled: true, accountNumber: '' },
    },
    payment: companyData.payment || {
      provider: 'CHAPA',
      enabled: !!(paymentMethods?.chapa?.enabled),
      mode: 'LIVE',
      splitType: 'percentage',
      splitValue: 90,
    },
    cancellationPolicy: cancellationPolicy || { allowed: true, deadlineHours: 24, refundPercentage: 80 },
  });

  const adminUser = await User.create({
    name: adminName.trim(),
    email: adminEmail.toLowerCase().trim(),
    phone: adminPhone || phone,
    password: adminPassword,
    role: ROLES.COMPANY_ADMIN,
    companyId: company._id,
    city: city || 'Addis Ababa',
    isActive: companyStatus === 'active',
  });

  if (superAdminUser) {
    await AuditLog.create({
      user: superAdminUser._id,
      userEmail: superAdminUser.email,
      userRole: superAdminUser.role,
      companyId: company._id,
      companyName: company.companyName,
      action: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company._id.toString(),
      details: {
        companyName: company.companyName,
        licenseNumber: company.licenseNumber,
        status: companyStatus,
        paymentMethods: company.paymentMethods,
        adminEmail: adminUser.email,
      },
    }).catch(() => {});
  }

  return { company, adminUser: adminUser.toJSON() };
};

const getCompaniesList = async ({ status, search }) => {
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { licenseNumber: { $regex: search, $options: 'i' } },
    ];
  }
  return Company.find(query).sort({ createdAt: -1 });
};

const getActiveCompaniesList = async () => {
  return Company.find({ status: 'active' })
    .select('companyName logo rating totalReviews city description cancellationPolicy phone email')
    .sort({ companyName: 1 });
};


const publicCompanyFields = [
  'companyName', 'logo', 'city', 'description', 'rating', 'totalReviews',
  'phone', 'email', 'status', 'cancellationPolicy', 'paymentMethods.method',
  'paymentMethods.accountName', 'createdAt',
].join(' ');

const getCompanyDetails = async (companyId, { includeSensitive = false } = {}) => {
  const query = Company.findById(companyId);
  if (!includeSensitive) query.select(publicCompanyFields);

  const company = await query;
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  return company;
};

const updateCompanyStatus = async (companyId, newStatus, reason, superAdminUser) => {
  if (!['active', 'suspended', 'pending', 'rejected'].includes(newStatus)) {
    const err = new Error('Invalid company status value');
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  const prevStatus = company.status;
  company.status = newStatus;
  await company.save();

  if (newStatus === 'suspended' || newStatus === 'rejected') {
    await User.updateMany(
      { companyId: company._id },
      { $set: { isActive: false, suspendedByPlatform: true } }
    );
    if (newStatus === 'rejected') {
      const adminUser = await User.findOne({ companyId: company._id, role: ROLES.COMPANY_ADMIN });
      if (adminUser?.email) {
        sendCompanyRejectedEmail(adminUser.email, company.companyName, reason).catch(() => {});
      }
    }
  } else if (newStatus === 'active') {
    await User.updateMany(
      { companyId: company._id, isActive: false },
      { $set: { isActive: true }, $unset: { suspendedByPlatform: '' } }
    );
    const adminUser = await User.findOne({ companyId: company._id, role: ROLES.COMPANY_ADMIN });
    if (adminUser?.email) {
      sendCompanyApprovedEmail(adminUser.email, company.companyName).catch(() => {});
    }
  }

  if (superAdminUser) {
    await AuditLog.create({
      user: superAdminUser._id,
      userEmail: superAdminUser.email,
      userRole: superAdminUser.role,
      companyId: company._id,
      companyName: company.companyName,
      action: `COMPANY_STATUS_CHANGED_${newStatus.toUpperCase()}`,
      entityType: 'Company',
      entityId: company._id.toString(),
      details: { prevStatus, newStatus, reason },
    }).catch(() => {});
  }

  return company;
};

const updateCompanyProfile = async (companyId, updateData, adminUser) => {
  const isSuper = adminUser?.role === 'super_admin';

  if (!isSuper) {
    const actorCompanyId = adminUser?.companyId?._id
      ? adminUser.companyId._id.toString()
      : adminUser?.companyId
        ? adminUser.companyId.toString()
        : null;
    if (!actorCompanyId || actorCompanyId !== companyId.toString()) {
      const err = new Error('Access denied: you can only manage your own company');
      err.statusCode = 403;
      throw err;
    }
  }

  const company = await Company.findById(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'companyName',
    'licenseNumber',
    'registrationNumber',
    'tinNumber',
    'phone',
    'email',
    'address',
    'city',
    'logo',
    'description',
    ...(isSuper ? ['status'] : []),
    'paymentMethods',
    'cancellationPolicy',
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      company[field] = updateData[field];
    }
  });

  if (!isSuper && updateData.status !== undefined && updateData.status !== company.status) {
    const err = new Error('Only a platform super admin can change your company approval status.');
    err.statusCode = 403;
    throw err;
  }

  await company.save();

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      companyId: company._id,
      companyName: company.companyName,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'Company',
      entityId: company._id.toString(),
      details: {
        companyName: company.companyName,
        paymentMethods: company.paymentMethods,
        status: company.status,
      },
    }).catch(() => {});
  }

  return company;
};

module.exports = {
  createCompanyBySuperAdmin,
  getCompaniesList,
  getActiveCompaniesList,
  getCompanyDetails,
  updateCompanyStatus,
  updateCompanyProfile,
};
