const discountService = require('../services/discountService');

const getDiscounts = async (req, res, next) => {
  try {
    const discounts = await discountService.getDiscounts(req.user, req.query);
    res.json(discounts);
  } catch (err) {
    next(err);
  }
};

const createDiscount = async (req, res, next) => {
  try {
    const discount = await discountService.createDiscount(req.body, req.user);
    res.status(201).json({ success: true, discount });
  } catch (err) {
    next(err);
  }
};

const toggleDiscount = async (req, res, next) => {
  try {
    const discount = await discountService.toggleDiscount(req.params.id, req.user);
    res.json({ success: true, discount });
  } catch (err) {
    next(err);
  }
};

const deleteDiscount = async (req, res, next) => {
  try {
    const result = await discountService.deleteDiscount(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateDiscount = async (req, res, next) => {
  try {
    const discount = await discountService.updateDiscount(req.params.id, req.body, req.user);
    res.json({ success: true, discount });
  } catch (err) {
    next(err);
  }
};

const getPublicDiscounts = async (req, res, next) => {
  try {
    const discounts = await discountService.getPublicDiscounts();
    res.json(discounts);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDiscounts,
  getPublicDiscounts,
  createDiscount,
  updateDiscount,
  toggleDiscount,
  deleteDiscount,
};
