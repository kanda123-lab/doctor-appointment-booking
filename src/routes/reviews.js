const express = require('express');
const ReviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Public routes
router.post('/', ReviewController.createReview);
router.get('/', ReviewController.getReviews);
router.get('/stats', ReviewController.getReviewStats);
router.get('/featured', ReviewController.getFeaturedReviews);
router.get('/:id', ReviewController.getReviewById);

// Admin only routes
router.put('/:id/approval', adminAuth, ReviewController.updateReviewApproval);
router.delete('/:id', adminAuth, ReviewController.deleteReview);

module.exports = router;