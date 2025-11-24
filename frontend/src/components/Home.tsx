import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip,
  Fab,
  Tooltip,
  Zoom,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  Backdrop,
  IconButton,
  Paper
} from '@mui/material';
import {
  LocalHospital,
  PersonAdd,
  Security,
  Speed,
  AccessTime,
  Close,
  KeyboardArrowRight,
  Star,
  Verified
} from '@mui/icons-material';
import { keyframes } from '@mui/system';

// Animation keyframes
const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTagline, setCurrentTagline] = useState(0);
  const [showFloatingButtons, setShowFloatingButtons] = useState(true);

  const taglines = [
    'Safe and Secure',
    'Lightning Fast Queues',
    'Your Health First',
    'Available 24/7',
    'Professional Care'
  ];

  // Cycle through taglines
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [taglines.length]);

  // Auto-show onboarding for first-time users
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 2000);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #00f2fe)',
        backgroundSize: '400% 400%',
        animation: `${gradientShift} 15s ease infinite`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Floating Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: 100,
          height: 100,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: `${float} 6s ease-in-out infinite`,
          display: { xs: 'none', md: 'block' }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: 60,
          height: 60,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: `${float} 8s ease-in-out infinite`,
          animationDelay: '2s',
          display: { xs: 'none', md: 'block' }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '20%',
          width: 80,
          height: 80,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: `${float} 7s ease-in-out infinite`,
          animationDelay: '4s',
          display: { xs: 'none', md: 'block' }
        }}
      />

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 8 }, pb: 4, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} sx={{ minHeight: '90vh', alignItems: 'center' }}>
          {/* Hero Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Fade in timeout={1000}>
              <Box textAlign={{ xs: 'center', md: 'left' }}>
                {/* Hero Icon with Animation */}
                <Zoom in timeout={1200}>
                  <Avatar
                    sx={{
                      width: { xs: 80, md: 120 },
                      height: { xs: 80, md: 120 },
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      mb: 3,
                      mx: { xs: 'auto', md: 0 },
                      animation: `${pulse} 3s infinite`,
                      boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    <LocalHospital sx={{ fontSize: { xs: 40, md: 60 }, color: 'white' }} />
                  </Avatar>
                </Zoom>

                {/* Main Headline */}
                <Typography
                  variant={isMobile ? 'h3' : 'h2'}
                  fontWeight="800"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                    lineHeight: 1.2
                  }}
                >
                  Virtual Queue Management
                </Typography>

                {/* Subtitle */}
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    mb: 2,
                    fontWeight: 400
                  }}
                >
                  Access healthcare services with ease
                </Typography>

                {/* Animated Tagline */}
                <Box sx={{ height: 40, mb: 4 }}>
                  <Fade
                    in
                    key={currentTagline}
                    timeout={500}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontStyle: 'italic',
                        fontSize: '1.1rem'
                      }}
                    >
                      ✨ {taglines[currentTagline]}
                    </Typography>
                  </Fade>
                </Box>
              </Box>
            </Fade>
          </Grid>

          {/* Interactive Portal Cards */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ pl: { md: 4 } }}>
              <Grid container spacing={3}>
                {/* Doctor Portal Card */}
                <Grid size={12}>
                  <Slide in timeout={1000} direction="left">
                    <Card
                      onClick={() => navigate('/doctor')}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: 'scale(1)',
                        border: '2px solid transparent',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'scale(1.02) translateY(-8px)',
                          boxShadow: '0 25px 50px rgba(102, 126, 234, 0.4)',
                          '&::before': {
                            opacity: 1
                          }
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                          opacity: 0,
                          transition: 'opacity 0.6s'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                        <Box display="flex" alignItems="center" gap={3}>
                          <Avatar
                            sx={{
                              width: 60,
                              height: 60,
                              bgcolor: 'rgba(255, 255, 255, 0.2)',
                              animation: `${pulse} 4s infinite`
                            }}
                          >
                            <LocalHospital sx={{ fontSize: 30 }} />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="h5" fontWeight="700" mb={1}>
                              Doctor Portal
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                              Manage appointments, view patient records, and streamline your practice
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight="600">
                                Access Now
                              </Typography>
                              <KeyboardArrowRight />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Slide>
                </Grid>

                {/* Patient Portal Card */}
                <Grid size={12}>
                  <Slide in timeout={1200} direction="left">
                    <Card
                      onClick={() => navigate('/patient')}
                      sx={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: 'scale(1)',
                        border: '2px solid transparent',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'scale(1.02) translateY(-8px)',
                          boxShadow: '0 25px 50px rgba(240, 147, 251, 0.4)',
                          '&::before': {
                            opacity: 1
                          }
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                          opacity: 0,
                          transition: 'opacity 0.6s'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                        <Box display="flex" alignItems="center" gap={3}>
                          <Avatar
                            sx={{
                              width: 60,
                              height: 60,
                              bgcolor: 'rgba(255, 255, 255, 0.2)',
                              animation: `${pulse} 4s infinite`,
                              animationDelay: '1s'
                            }}
                          >
                            <PersonAdd sx={{ fontSize: 30 }} />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="h5" fontWeight="700" mb={1}>
                              Patient Portal
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                              Book appointments, view medical history, and manage your healthcare
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight="600">
                                Get Started
                              </Typography>
                              <KeyboardArrowRight />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Slide>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        {/* Quick Info Badges */}
        <Container maxWidth="md" sx={{ mt: 6 }}>
          <Fade in timeout={1500}>
            <Grid container spacing={2} justifyContent="center">
              {[
                { icon: AccessTime, label: 'Real-time Updates', color: '#667eea' },
                { icon: Security, label: 'Secure & Private', color: '#f093fb' },
                { icon: Speed, label: 'Lightning Fast', color: '#4facfe' },
                { icon: Verified, label: '100% Reliable', color: '#f5576c' }
              ].map((feature, index) => (
                <Grid key={feature.label}>
                  <Zoom in timeout={1500 + index * 200}>
                    <Chip
                      icon={<feature.icon sx={{ color: 'white !important' }} />}
                      label={feature.label}
                      sx={{
                        background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}dd 100%)`,
                        color: 'white',
                        fontWeight: 600,
                        py: 2,
                        px: 1,
                        animation: `${pulse} 3s infinite`,
                        animationDelay: `${index * 0.5}s`,
                        boxShadow: `0 4px 20px ${feature.color}44`,
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: `0 8px 30px ${feature.color}66`
                        },
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          </Fade>
        </Container>
      </Container>

      {/* Floating Quick Access Buttons */}
      {showFloatingButtons && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Zoom in timeout={2000}>
            <Tooltip title="Quick Doctor Login" placement="left">
              <Fab
                onClick={() => navigate('/doctor')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'scale(1.1)'
                  },
                  animation: `${float} 3s ease-in-out infinite`
                }}
              >
                <LocalHospital />
              </Fab>
            </Tooltip>
          </Zoom>
          <Zoom in timeout={2200}>
            <Tooltip title="Quick Patient Access" placement="left">
              <Fab
                onClick={() => navigate('/patient')}
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #e879f9 0%, #ef4444 100%)',
                    transform: 'scale(1.1)'
                  },
                  animation: `${float} 3s ease-in-out infinite`,
                  animationDelay: '1s'
                }}
              >
                <PersonAdd />
              </Fab>
            </Tooltip>
          </Zoom>
          <Zoom in timeout={2400}>
            <Tooltip title="Hide Quick Access" placement="left">
              <Fab
                size="small"
                onClick={() => setShowFloatingButtons(false)}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'scale(1.1)'
                  }
                }}
              >
                <Close fontSize="small" />
              </Fab>
            </Tooltip>
          </Zoom>
        </Box>
      )}

      {/* Onboarding Walkthrough */}
      <Backdrop
        open={showOnboarding}
        sx={{ zIndex: 2000, bgcolor: 'rgba(0, 0, 0, 0.8)' }}
        onClick={handleOnboardingComplete}
      >
        <Paper
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            onClick={handleOnboardingComplete}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
          >
            <Close />
          </IconButton>
          <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255, 255, 255, 0.2)', mx: 'auto', mb: 2 }}>
            <Star sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography variant="h5" fontWeight="700" mb={2}>
            Welcome to HealthQueue!
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
            Choose your role to get started with our virtual queue management system.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => {
                navigate('/doctor');
                handleOnboardingComplete();
              }}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              I'm a Doctor
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                navigate('/patient');
                handleOnboardingComplete();
              }}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              I'm a Patient
            </Button>
          </Box>
        </Paper>
      </Backdrop>
    </Box>
  );
};

export default Home;