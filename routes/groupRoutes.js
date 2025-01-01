const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { isLoggedIn } = require('../middleware/auth');

// Existing routes...
router.post('/:id/join', isLoggedIn, groupController.joinGroup);
router.post('/:id/leave', isLoggedIn, groupController.leaveGroup);
router.post('/:groupId/approve/:userId', isLoggedIn, groupController.approveJoinRequest);
router.post('/:groupId/reject/:userId', isLoggedIn, groupController.rejectJoinRequest);

module.exports = router; 