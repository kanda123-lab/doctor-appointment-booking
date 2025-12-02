const API_BASE_URL = 'http://localhost:3000/api';
console.log('*** UPDATED REVIEW SERVICE LOADED *** API_BASE_URL:', API_BASE_URL);

export interface ReviewData {
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_email?: string;
  doctor_id?: string;
  appointment_id?: string;
  is_anonymous?: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_email?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  specialization?: string;
  is_featured: boolean;
  is_approved: boolean;
  is_anonymous: boolean;
  created_at: string;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_breakdown: {
    [key: number]: number;
  };
}

class ReviewService {
  // Submit a new review
  static async createReview(reviewData: ReviewData): Promise<Review> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.message || 'Failed to submit review');
      }

      return data.data.review;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  // Get all reviews with optional filters
  static async getReviews(options: {
    page?: number;
    limit?: number;
    rating?: number;
    doctor_id?: string;
    featured?: boolean;
    sort?: string;
    order?: string;
  } = {}): Promise<{
    reviews: Review[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_reviews: number;
      limit: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }> {
    try {
      const searchParams = new URLSearchParams();

      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/reviews?${searchParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch reviews');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  // Get featured reviews
  static async getFeaturedReviews(limit: number = 5): Promise<Review[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/featured?limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch featured reviews');
      }

      return data.data.reviews;
    } catch (error) {
      console.error('Error fetching featured reviews:', error);
      throw error;
    }
  }

  // Get review statistics
  static async getReviewStats(doctor_id?: string): Promise<ReviewStats> {
    try {
      const searchParams = new URLSearchParams();
      if (doctor_id) {
        searchParams.append('doctor_id', doctor_id);
      }

      const response = await fetch(`${API_BASE_URL}/reviews/stats?${searchParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch review stats');
      }

      return data.data.stats;
    } catch (error) {
      console.error('Error fetching review stats:', error);
      throw error;
    }
  }

  // Get single review by ID
  static async getReviewById(id: string): Promise<Review> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch review');
      }

      return data.data.review;
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }
}

export { ReviewService };