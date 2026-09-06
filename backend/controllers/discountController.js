const Discount = require('../models/Discount');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// @desc    Get discounts for company
// @route   GET /api/discounts
// @access  Private (Company Admin, Super Admin)
const getDiscounts = async (req, res, next) => {
  try {
    const query = {};
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'Company id required' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const discounts = await Discount.find(query).populate('route').sort('-createdAt');
    res.json(discounts);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new discount
// @route   POST> /api/discounts
// @access  Private (Company Admin, Super Admin)
const createDiscount = async (req, res, next) => {
  try {
    let companyId = isSuper(req.user) ? (req.body.companyId || getCompId(req.user)) : getCompId(req.user);
    if (!companyId) return res.status(400).json({ message: 'Company ID required' });

    const { code, name, discountType, discountValue, tripType, route, minAmount, startDate, endDate } = req.body;
    if (!code || !name || discountValue === undefined) {
      return res.status(400).json({ message: 'Code, Name, and Discount Value are required.' });
    }

    const existing = await Discount.findOne({ companyId, code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'A discount with this code already exists for your company.' });
    }

    const discount = await Discount.create({
      companyId,
      code: code.toUpperCase().trim(),
      name,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      tripType: tripType || 'round',
      route: route || null,
      minAmount: Number(minAmount || 0),
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'DISCOUNT_CREATED',
      entityType: 'Discount',
      entityId: discount._id.toString(),
      details: { code: discount.code, discountValue: discount.discountValue },
    });

    res.status(201).json(discount);
  } catch (err) {
    next(err);
  }
};

// @desc    Update discount
// @route   PUT /api/discounts/:id
// @access  Private (Company Admin, Super Admin)
const updateDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: 'Discount not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== discount.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    Object.assign(discount, req.body);
    if (req.body.code) discount.code = req.body.code.toUpperCase().trim();
    await discount.save();

    res.json(discount);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete discount
// @route   DELETE /api/discounts/:id
// @access  Private (Company Admin, Super Admin)
const deleteDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: 'Discount not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== discount.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await discount.deleteOne();
    res.json({ success: true, message: 'Discount deleted' });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
};
