const Review = require('../models/Review');
const logger = require('../utils/logger');

class ReviewController {
  // Create a new review (public endpoint)
  static async createReview(req, res) {
    try {
      const {
        rating,
        comment,
        reviewer_name,
        reviewer_email,
        doctor_id,
        appointment_id,
        is_anonymous = false
      } = req.body;

      // Validation
      console.log('Received review data:', { rating, comment, reviewer_name });
      if (!rating || !comment || !reviewer_name) {
        console.log('Missing required fields:', { rating: !!rating, comment: !!comment, reviewer_name: !!reviewer_name });
        return res.status(400).json({
          status: 'error',
          message: 'Rating, comment, and reviewer name are required'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          status: 'error',
          message: 'Rating must be between 1 and 5'
        });
      }

      if (comment.trim().length < 5) {
        console.log('Comment too short:', comment.trim().length, 'characters');
        return res.status(400).json({
          status: 'error',
          message: 'Comment must be at least 5 characters long'
        });
      }

      const reviewData = {
        rating: parseInt(rating),
        comment: comment.trim(),
        reviewer_name: reviewer_name.trim(),
        reviewer_email: reviewer_email ? reviewer_email.trim() : null,
        patient_id: req.user ? req.user.profile_id : null,
        doctor_id: doctor_id || null,
        appointment_id: appointment_id || null,
        is_anonymous
      };

      const review = await Review.create(reviewData);

      logger.info('Review created successfully', {
        reviewId: review.id,
        rating: review.rating,
        reviewerName: reviewer_name,
        doctorId: doctor_id
      });

      res.status(201).json({
        status: 'success',
        message: 'Review submitted successfully. Thank you for your feedback!',
        data: {
          review: {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            reviewer_name: review.reviewer_name,
            created_at: review.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error creating review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to submit review. Please try again.'
      });
    }
  }

  // Get all approved reviews with pagination and filters
  static async getReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        rating,
        doctor_id,
        featured = null,
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const options = {
        limit: parseInt(limit),
        offset,
        rating_filter: rating ? parseInt(rating) : null,
        doctor_id: doctor_id || null,
        is_featured: featured !== null ? featured === 'true' : null,
        order_by: sort,
        order_direction: order.toUpperCase()
      };

      const result = await Review.findAll(options);

      const totalPages = Math.ceil(result.total / parseInt(limit));

      res.json({
        status: 'success',
        data: {
          reviews: result.reviews,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_reviews: result.total,
            limit: parseInt(limit),
            has_next: parseInt(page) < totalPages,
            has_prev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching reviews:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch reviews'
      });
    }
  }

  // Get single review by ID
  static async getReviewById(req, res) {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);

      if (!review) {
        return res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
      }

      res.json({
        status: 'success',
        data: { review }
      });
    } catch (error) {
      logger.error('Error fetching review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch review'
      });
    }
  }

  // Get review statistics
  static async getReviewStats(req, res) {
    try {
      const { doctor_id } = req.query;

      const stats = await Review.getStats(doctor_id);

      res.json({
        status: 'success',
        data: {
          stats: {
            total_reviews: parseInt(stats.total_reviews),
            average_rating: parseFloat(stats.average_rating) || 0,
            rating_breakdown: {
              5: parseInt(stats.five_star),
              4: parseInt(stats.four_star),
              3: parseInt(stats.three_star),
              2: parseInt(stats.two_star),
              1: parseInt(stats.one_star)
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching review stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch review statistics'
      });
    }
  }

  // Get featured reviews
  static async getFeaturedReviews(req, res) {
    try {
      const { limit = 5 } = req.query;

      const reviews = await Review.getFeatured(parseInt(limit));

      res.json({
        status: 'success',
        data: { reviews }
      });
    } catch (error) {
      logger.error('Error fetching featured reviews:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch featured reviews'
      });
    }
  }

  // Update review approval (admin only)
  static async updateReviewApproval(req, res) {
    try {
      const { id } = req.params;
      const { is_approved, is_featured = false } = req.body;

      if (typeof is_approved !== 'boolean') {
        return res.status(400).json({
          status: 'error',
          message: 'is_approved must be a boolean value'
        });
      }

      const review = await Review.updateApproval(id, is_approved, is_featured);

      if (!review) {
        return res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
      }

      logger.info('Review approval status updated', {
        reviewId: id,
        approved: is_approved,
        featured: is_featured,
        updatedBy: req.user ? req.user.id : 'system'
      });

      res.json({
        status: 'success',
        message: 'Review approval status updated successfully',
        data: { review }
      });
    } catch (error) {
      logger.error('Error updating review approval:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update review approval status'
      });
    }
  }

  // Delete review (admin only)
  static async deleteReview(req, res) {
    try {
      const { id } = req.params;

      const review = await Review.delete(id);

      if (!review) {
        return res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
      }

      logger.info('Review deleted', {
        reviewId: id,
        deletedBy: req.user ? req.user.id : 'system'
      });

      res.json({
        status: 'success',
        message: 'Review deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete review'
      });
    }
  }
}

module.exports = ReviewController;