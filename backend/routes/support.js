const express = require('express');
const router = express.Router();
const {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  addMessageToTicket,
  updateSupportTicketStatus,
  updateSupportTicket,
  deleteSupportTicket,
} = require('../controllers/supportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getSupportTickets)
  .post(createSupportTicket);

router
  .route('/:id')
  .get(getSupportTicketById)
  .put(updateSupportTicket)
  .delete(deleteSupportTicket);

router
  .route('/:id/messages')
  .post(addMessageToTicket);

router
  .route('/:id/status')
  .put(updateSupportTicketStatus);

module.exports = router;
