const router = require('express').Router();
const {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'agent'), getSupportTickets);
router.post('/', protect, createSupportTicket);
router.put('/:id', protect, authorize('admin', 'agent'), updateSupportTicket);

module.exports = router;
