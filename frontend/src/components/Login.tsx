import React, { useState } from 'react';
import { useAuth } from '../context/SimpleAuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { ReviewService, ReviewData } from '../services/reviewService';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Chip,
  Link,
  Fade,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Rating
} from '@mui/material';
import {
  LocalHospital,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  LoginRounded,
  Security,
  Fingerprint,
  Google,
  Apple,
  CheckCircle,
  Reviews,
  Star,
  StarBorder,
  Send,
  Close
} from '@mui/icons-material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Review modal states
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Form validation functions
  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError(validateEmail(value));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) {
      setPasswordError(validatePassword(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    
    if (emailErr || passwordErr) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simple mock login - navigate based on email
      if (email.includes('doctor')) {
        navigate('/doctor');
      } else if (email.includes('patient')) {
        navigate('/patient'); 
      } else {
        navigate('/admin');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = () => {
    // Placeholder for biometric authentication
    console.log('Biometric login requested');
  };

  const handleSocialLogin = (provider: string) => {
    // Placeholder for social login
    console.log(`${provider} login requested`);
  };

  const handleReviewSubmit = async () => {
    if (!rating || !reviewText.trim() || !reviewerName.trim()) {
      setError('Please fill in all review fields');
      return;
    }

    setSubmittingReview(true);
    
    try {
      const reviewData: ReviewData = {
        rating,
        comment: reviewText,
        reviewer_name: reviewerName,
        is_anonymous: true // Anonymous review from login page
      };
      
      await ReviewService.createReview(reviewData);
      
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewOpen(false);
        setReviewSuccess(false);
        setRating(0);
        setReviewText('');
        setReviewerName('');
      }, 2000);
      
    } catch (error: any) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    setRating(0);
    setReviewText('');
    setReviewerName('');
    setReviewSuccess(false);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: { xs: 2, sm: 4 },
      px: { xs: 3, sm: 6 }
    }}>
      <Box sx={{
        maxWidth: 440,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}>
        {/* Medical Branding Header */}
        <Zoom in timeout={500}>
          <Box sx={{
            textAlign: 'center',
            color: 'white',
            mb: 2
          }}>
            <Avatar sx={{
              width: 80,
              height: 80,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <LocalHospital sx={{ fontSize: 40, color: 'white' }} />
            </Avatar>
            <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
              MediQueue Portal
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Secure Medical Appointment System
            </Typography>
            <Chip
              icon={<Security sx={{ fontSize: 16 }} />}
              label="SSL Protected"
              size="small"
              sx={{
                mt: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            />
          </Box>
        </Zoom>

        {/* Login Card */}
        <Fade in timeout={700}>
          <Card sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <CardContent sx={{
              p: { xs: 4, sm: 5 },
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
            }}>
              <Typography variant="h5" fontWeight="700" color="text.primary" sx={{
                mb: 1,
                textAlign: 'center'
              }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{
                mb: 4,
                textAlign: 'center'
              }}>
                Sign in to access your medical portal
              </Typography>

              {/* Error Alert */}
              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    onClose={() => setError('')}
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: 20
                      }
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              {/* Login Form */}
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Email Field */}
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => setEmailError(validateEmail(email))}
                  error={!!emailError}
                  helperText={emailError}
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ fontSize: 22, color: email ? 'primary.main' : 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      height: 56,  // 48px+ for touch targets
                      borderRadius: 3,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)'
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: 2
                    }
                  }}
                />

                {/* Password Field */}
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  error={!!passwordError}
                  helperText={passwordError}
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ fontSize: 22, color: password ? 'primary.main' : 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ mr: 1 }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      height: 56,  // 48px+ for touch targets
                      borderRadius: 3,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      },
                      '&.Mui-focused': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)'
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: 2
                    }
                  }}
                />

                {/* Sign In Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <LoginRounded sx={{ fontSize: 22 }} />
                    )
                  }
                  sx={{
                    height: 56,  // 48px+ for touch targets
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b5b95 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)'
                    },
                    '&:active': {
                      transform: 'translateY(0px)'
                    },
                    '&:disabled': {
                      background: 'rgba(102, 126, 234, 0.6)',
                      transform: 'none',
                      boxShadow: 'none'
                    }
                  }}
                >
                  {loading ? 'Signing you in...' : 'Sign In to Portal'}
                </Button>

                {/* Divider */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  my: 2
                }}>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Or continue with
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
                </Box>

                {/* Social & Biometric Login */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2
                }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handleSocialLogin('google')}
                    startIcon={<Google />}
                    sx={{
                      height: 48,
                      borderRadius: 3,
                      textTransform: 'none',
                      border: '2px solid',
                      borderColor: 'grey.300',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    Google
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handleSocialLogin('apple')}
                    startIcon={<Apple />}
                    sx={{
                      height: 48,
                      borderRadius: 3,
                      textTransform: 'none',
                      border: '2px solid',
                      borderColor: 'grey.300',
                      '&:hover': {
                        borderColor: 'text.primary',
                        backgroundColor: 'grey.100',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    Apple
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleBiometricLogin}
                    startIcon={<Fingerprint />}
                    sx={{
                      height: 48,
                      borderRadius: 3,
                      textTransform: 'none',
                      border: '2px solid',
                      borderColor: 'grey.300',
                      '&:hover': {
                        borderColor: 'success.main',
                        backgroundColor: 'success.50',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    Touch ID
                  </Button>
                </Box>

                {/* Links */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pt: 2
                }}>
                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Forgot Password?
                  </Link>
                  
                  <Link
                    component={RouterLink}
                    to="/register"
                    variant="body2"
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Create Account
                  </Link>
                </Box>

                {/* Trust Indicators */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    HIPAA Compliant • 256-bit SSL Encryption
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>

        {/* Review Floating Action Button */}
        <Fab
          onClick={() => setReviewOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ee5a24 0%, #ff4757 100%)',
              transform: 'scale(1.1)',
              boxShadow: '0 12px 32px rgba(255, 107, 107, 0.4)'
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          size="large"
        >
          <Reviews sx={{ fontSize: 28 }} />
        </Fab>

        {/* Review Modal */}
        <Dialog
          open={reviewOpen}
          onClose={handleReviewClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{
            textAlign: 'center',
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box>
              <Typography variant="h5" fontWeight="700" color="primary">
                Share Your Experience
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Help us improve our medical services
              </Typography>
            </Box>
            <IconButton
              onClick={handleReviewClose}
              sx={{
                color: 'grey.500',
                '&:hover': { backgroundColor: 'grey.100' }
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 2 }}>
            {reviewSuccess ? (
              <Box sx={{
                textAlign: 'center',
                py: 4
              }}>
                <CheckCircle sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2
                }} />
                <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                  Thank You!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your review has been submitted successfully
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Rating Section */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                    Rate Your Experience
                  </Typography>
                  <Rating
                    value={rating}
                    onChange={(event, newValue) => setRating(newValue)}
                    size="large"
                    sx={{
                      fontSize: '3rem',
                      '& .MuiRating-iconFilled': {
                        color: '#ff6b6b'
                      },
                      '& .MuiRating-iconHover': {
                        color: '#ff4757'
                      }
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </Typography>
                </Box>

                {/* Name Field */}
                <TextField
                  fullWidth
                  label="Your Name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  InputProps={{
                    sx: {
                      borderRadius: 3,
                      height: 56
                    }
                  }}
                />

                {/* Review Text */}
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Write your review"
                  placeholder="Tell us about your experience with our medical services..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  InputProps={{
                    sx: {
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}
          </DialogContent>
          
          {!reviewSuccess && (
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button
                onClick={handleReviewClose}
                color="inherit"
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                variant="contained"
                disabled={submittingReview || !rating || !reviewText.trim() || !reviewerName.trim()}
                startIcon={
                  submittingReview ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Send />
                  )
                }
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ee5a24 0%, #ff4757 100%)'
                  }
                }}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </DialogActions>
          )}
        </Dialog>
      </Box>
    </Box>
  );
};

export default Login;