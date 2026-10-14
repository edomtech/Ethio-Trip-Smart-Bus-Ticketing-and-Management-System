const companyService = require('../services/companyService');

const registerCompany = async (req, res, next) => {
  try {
    const result = await companyService.createCompanyBySuperAdmin(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Transport company created successfully with Administrator account!',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.getCompaniesList(req.query);
    res.json({ success: true, count: companies.length, companies });
  } catch (err) {
    next(err);
  }
};

const getActiveCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.getActiveCompaniesList();
    res.json({ success: true, count: companies.length, companies });
  } catch (err) {
    next(err);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      const ownCompanyId = req.user.companyId?._id?.toString() || req.user.companyId?.toString() || null;
      if (!ownCompanyId || ownCompanyId !== req.params.id) {
        return res.status(403).json({ message: 'Access denied: you may only view your own company' });
      }
    }
    const company = await companyService.getCompanyDetails(req.params.id);
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const company = await companyService.updateCompanyStatus(req.params.id, status, reason, req.user);
    res.json({
      success: true,
      message: `Company status successfully updated to ${status}`,
      company,
    });
  } catch (err) {
    next(err);
  }
};

const updateCompanyProfile = async (req, res, next) => {
  try {
    let companyId = req.params?.id;
    if (!companyId || req.user.role !== 'super_admin') {
      companyId = req.user.companyId?._id || req.user.companyId;
    }
    if (!companyId) return res.status(400).json({ message: 'User does not belong to a company or company ID not provided' });

    const company = await companyService.updateCompanyProfile(companyId, req.body, req.user);
    res.json({ success: true, message: 'Company profile updated successfully', company });
  } catch (err) {
    next(err);
  }
};

const getMyCompany = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) return res.status(400).json({ message: 'No company associated with user' });

    const includeSensitive = req.user.role === 'super_admin' || req.user.role === 'company_admin';
    const company = await companyService.getCompanyDetails(companyId, { includeSensitive });
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
