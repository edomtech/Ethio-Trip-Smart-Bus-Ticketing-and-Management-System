const router = require('express').Router();
const {
  getAllUsers,
  getAgents,
  createAgent,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/agents', protect, authorize('admin'), getAgents);
router.post('/agents', protect, authorize('admin'), createAgent);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
