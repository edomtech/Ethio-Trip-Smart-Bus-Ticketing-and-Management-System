const router = require('express').Router();
const {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} = require('../controllers/discountController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('company_admin', 'super_admin', 'admin'), getDiscounts);
router.post('/', authorize('company_admin', 'super_admin', 'admin'), createDiscount);
router.put('/:id', authorize('company_admin', 'super_admin', 'admin'), updateDiscount);
router.delete('/:id', authorize('company_admin', 'super_admin', 'admin'), deleteDiscount);

module.exports = router;
