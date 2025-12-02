import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  CircularProgress,
  Fab,
  Alert
} from '@mui/material';
import {
  LocalHospital,
  PersonAdd,
  Security,
  Speed,
  AccessTime,
  Reviews,
  Send
} from '@mui/icons-material';
import { ReviewService, ReviewData } from '../services/reviewService';

const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // Review modal states
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const handleReviewSubmit = async () => {
    if (!rating || !reviewText.trim() || !reviewerName.trim()) {
      return;
    }

    if (reviewText.trim().length < 5) {
      alert('Comment must be at least 5 characters long');
      return;
    }

    setSubmittingReview(true);

    try {
      const reviewData: ReviewData = {
        rating: rating,
        comment: reviewText.trim(),
        reviewer_name: reviewerName.trim(),
        is_anonymous: false
      };

      await ReviewService.createReview(reviewData);
      setReviewSuccess(true);
      
      // Reset form
      setRating(0);
      setReviewText('');
      setReviewerName('');
      
      setTimeout(() => {
        setReviewOpen(false);
        setReviewSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const features = [
    {
      icon: <PersonAdd sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Easy Registration',
      description: 'Quick and simple registration process for patients and doctors.'
    },
    {
      icon: <AccessTime sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '24/7 Availability',
      description: 'Round-the-clock access to healthcare services and support.'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Secure & Private',
      description: 'Your health data is protected with enterprise-grade security.'
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Fast Service',
      description: 'Quick appointment booking and efficient healthcare delivery.'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Hero Section */}
      <Container
        maxWidth={false}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 4
          }}>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 'bold', fontSize: { xs: '2.5rem', md: '3.5rem' } }}
              >
                Your Health, Our Priority
              </Typography>
              <Typography
                variant="h5"
                paragraph
                sx={{ opacity: 0.9, mb: 4, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
              >
                Modern healthcare management system for seamless doctor-patient interactions
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: { xs: 'center', md: 'flex-start' }
              }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/patient')}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    minWidth: 200
                  }}
                >
                  Patient Portal
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/doctor')}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': { 
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    },
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    minWidth: 200
                  }}
                >
                  Doctor Portal
                </Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
              <LocalHospital sx={{ fontSize: 200, opacity: 0.8 }} />
            </Box>
          </Box>
        </Container>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 'bold' }}
        >
          Why Choose Our Platform?
        </Typography>
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'center'
        }}>
          {features.map((feature, index) => (
            <Box 
              key={index}
              sx={{ 
                flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                minWidth: 250,
                maxWidth: 300
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-5px)' }
                }}
              >
                <CardContent>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Call to Action */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" align="center" paragraph sx={{ opacity: 0.9 }}>
            Join thousands of patients and healthcare providers using our platform
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 2, 
            mt: 3,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center'
          }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/patient')}
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main', 
                '&:hover': { bgcolor: 'grey.100' },
                minWidth: 200
              }}
            >
              Get Started as Patient
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/doctor')}
              sx={{ 
                borderColor: 'white', 
                color: 'white', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                minWidth: 200
              }}
            >
              Join as Doctor
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Floating Review Button */}
      <Fab
        color="primary"
        aria-label="leave review"
        onClick={() => setReviewOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1000
        }}
      >
        <Reviews />
      </Fab>

      {/* Review Modal */}
      <Dialog
        open={reviewOpen}
        onClose={() => !submittingReview && setReviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Leave a Review
          </Typography>
        </DialogTitle>
        <DialogContent>
          {reviewSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Thank you for your review! It has been submitted successfully.
            </Alert>
          ) : (
            <Box sx={{ pt: 1 }}>
              <TextField
                autoFocus
                margin="dense"
                label="Your Name"
                fullWidth
                variant="outlined"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ mb: 3 }}>
                <Typography component="legend" sx={{ mb: 1 }}>
                  Rating
                </Typography>
                <Rating
                  name="review-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                  }}
                  size="large"
                />
              </Box>
              
              <TextField
                margin="dense"
                label="Your Review"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with our healthcare platform..."
                helperText={`${reviewText.length} characters (minimum 5 required)`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {!reviewSuccess && (
            <>
              <Button 
                onClick={() => setReviewOpen(false)}
                disabled={submittingReview}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                variant="contained"
                disabled={!rating || !reviewText.trim() || !reviewerName.trim() || submittingReview}
                startIcon={submittingReview ? <CircularProgress size={20} /> : <Send />}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;