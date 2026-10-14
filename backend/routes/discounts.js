const router = require('express').Router();
const {
  getDiscounts,
  getPublicDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} = require('../controllers/discountController');
const { protect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.get('/public', getPublicDiscounts);

router.use(protect);

router.get('/', authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), getDiscounts);
router.post('/', authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), createDiscount);
router.put('/:id', authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), updateDiscount);
router.delete('/:id', authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), deleteDiscount);

module.exports = router;
