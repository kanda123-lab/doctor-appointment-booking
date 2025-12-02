const { db } = require('../config/database');
const logger = require('../utils/logger');

class Review {
  // Create a new review
  static async create(reviewData) {
    try {
      const {
        rating,
        comment,
        reviewer_name,
        reviewer_email = null,
        patient_id = null,
        doctor_id = null,
        appointment_id = null,
        is_anonymous = false
      } = reviewData;

      const query = `
        INSERT INTO reviews (
          rating, comment, reviewer_name, reviewer_email, 
          patient_id, doctor_id, appointment_id, is_anonymous
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        rating, comment, reviewer_name, reviewer_email,
        patient_id, doctor_id, appointment_id, is_anonymous
      ];

      const result = await db.query(query, values);
      
      logger.info('Review created successfully', {
        reviewId: result.rows[0].id,
        rating,
        reviewerName: reviewer_name
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Get all approved reviews with pagination
  static async findAll(options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        rating_filter = null,
        doctor_id = null,
        is_featured = null,
        order_by = 'created_at',
        order_direction = 'DESC'
      } = options;

      let whereConditions = ['is_approved = true'];
      let queryParams = [];
      let paramIndex = 1;

      if (rating_filter) {
        whereConditions.push(`rating = $${paramIndex}`);
        queryParams.push(rating_filter);
        paramIndex++;
      }

      if (doctor_id) {
        whereConditions.push(`doctor_id = $${paramIndex}`);
        queryParams.push(doctor_id);
        paramIndex++;
      }

      if (is_featured !== null) {
        whereConditions.push(`is_featured = $${paramIndex}`);
        queryParams.push(is_featured);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          r.*,
          d.first_name as doctor_first_name,
          d.last_name as doctor_last_name,
          d.specialization
        FROM reviews r
        LEFT JOIN doctors d ON r.doctor_id = d.id
        ${whereClause}
        ORDER BY ${order_by} ${order_direction}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM reviews r
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));

      return {
        reviews: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error fetching reviews:', error);
      throw error;
    }
  }

  // Get review by ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          r.*,
          d.first_name as doctor_first_name,
          d.last_name as doctor_last_name,
          d.specialization,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name
        FROM reviews r
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN patients p ON r.patient_id = p.id
        WHERE r.id = $1
      `;

      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching review by ID:', error);
      throw error;
    }
  }

  // Update review approval status (admin function)
  static async updateApproval(id, is_approved, is_featured = false) {
    try {
      const query = `
        UPDATE reviews 
        SET is_approved = $1, is_featured = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await db.query(query, [is_approved, is_featured, id]);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Review approval status updated', {
        reviewId: id,
        approved: is_approved,
        featured: is_featured
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating review approval:', error);
      throw error;
    }
  }

  // Delete review (admin function)
  static async delete(id) {
    try {
      const query = 'DELETE FROM reviews WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Review deleted', { reviewId: id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting review:', error);
      throw error;
    }
  }

  // Get review statistics
  static async getStats(doctor_id = null) {
    try {
      let whereCondition = 'WHERE is_approved = true';
      let queryParams = [];

      if (doctor_id) {
        whereCondition += ' AND doctor_id = $1';
        queryParams = [doctor_id];
      }

      const query = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating)::NUMERIC(3,2) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
        FROM reviews 
        ${whereCondition}
      `;

      const result = await db.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting review stats:', error);
      throw error;
    }
  }

  // Get featured reviews
  static async getFeatured(limit = 5) {
    try {
      const query = `
        SELECT 
          r.*,
          d.first_name as doctor_first_name,
          d.last_name as doctor_last_name,
          d.specialization
        FROM reviews r
        LEFT JOIN doctors d ON r.doctor_id = d.id
        WHERE r.is_approved = true AND r.is_featured = true
        ORDER BY r.created_at DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching featured reviews:', error);
      throw error;
    }
  }
}

module.exports = Review;