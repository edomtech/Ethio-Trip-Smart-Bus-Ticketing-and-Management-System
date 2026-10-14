const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendPassengerEmail,
  sendTicketEmailToPassenger,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../constants/roles');

router.use(protect);
router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.delete('/clear-all', clearAllNotifications);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

router.post('/send-passenger-email', authorize(ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), sendPassengerEmail);
router.post('/send-ticket-email', authorize(ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), sendTicketEmailToPassenger);

module.exports = router;
