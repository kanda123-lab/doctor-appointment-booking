import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Rating,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Container,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Stack,
  Avatar,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Skeleton
} from '@mui/material';
import {
  Visibility,
  Refresh,
  Dashboard as DashboardIcon,
  Reviews as ReviewsIcon,
  Analytics as AnalyticsIcon,
  Star,
  Home as HomeIcon,
  Search as SearchIcon,
  TrendingUp,
  TrendingDown,
  MoreVert,
  FilterList,
  Person,
  Event
} from '@mui/icons-material';
import { ReviewService, Review, ReviewStats } from '../services/reviewService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter reviews based on search term
    if (searchTerm) {
      const filtered = reviews.filter(review =>
        review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReviews(filtered);
    } else {
      setFilteredReviews(reviews);
    }
  }, [reviews, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        ReviewService.getReviews({ limit: 100 }),
        ReviewService.getReviewStats()
      ]);
      setReviews(reviewsData.reviews);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReview(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mock trend data (you can replace with real calculations)
  const getTrendData = (current: number, type: string) => {
    const mockPrevious = type === 'reviews' ? current - 2 : current - 0.2;
    const isPositive = current > mockPrevious;
    const percentage = Math.abs(((current - mockPrevious) / mockPrevious) * 100).toFixed(1);
    return { isPositive, percentage };
  };

  const EnhancedStatsCard = ({ 
    title, 
    value, 
    icon, 
    trend,
    color = 'primary' 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode;
    trend?: { isPositive: boolean; percentage: string };
    color?: 'primary' | 'success' | 'warning' | 'info';
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${theme.palette[color].light}15 0%, ${theme.palette[color].main}05 100%)`,
        border: `1px solid ${theme.palette[color].light}30`,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="text.secondary" 
              gutterBottom 
              variant="body2" 
              sx={{ fontSize: '0.85rem', fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: `${color}.main`,
                fontSize: { xs: '1.5rem', sm: '2rem' }
              }}
            >
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend.isPositive ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    fontWeight: 600
                  }}
                >
                  {trend.percentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: `${color}.main`,
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 }
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const ReviewCard = ({ review }: { review: Review }) => (
    <Card 
      sx={{ 
        mb: 2,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[3]
        }
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header with reviewer info and actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                width: 40, 
                height: 40, 
                mr: 2,
                fontSize: '1rem'
              }}
            >
              {review.reviewer_name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                {review.reviewer_name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Rating value={review.rating} readOnly size="small" />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(review.created_at)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => handleViewReview(review)}>
            <MoreVert />
          </IconButton>
        </Box>

        {/* Comment */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: { xs: 3, sm: 2 },
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4
          }}
        >
          "{review.comment}"
        </Typography>

        {/* Status and ID */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip 
            label={`ID: ${review.id.substring(0, 8)}`} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          {review.is_approved && (
            <Chip label="Approved" color="success" size="small" sx={{ fontSize: '0.7rem' }} />
          )}
          {review.is_featured && (
            <Chip label="Featured" color="primary" size="small" sx={{ fontSize: '0.7rem' }} />
          )}
          {review.is_anonymous && (
            <Chip label="Anonymous" color="default" size="small" sx={{ fontSize: '0.7rem' }} />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button 
          size="small" 
          startIcon={<Visibility />}
          onClick={() => handleViewReview(review)}
          sx={{ fontSize: '0.8rem' }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
            <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
            <Skeleton variant="text" width={120} sx={{ flexGrow: 1 }} />
            <Skeleton variant="rectangular" width={60} height={32} sx={{ mr: 1 }} />
            <Skeleton variant="rectangular" width={70} height={32} />
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ pt: 3 }}>
          <Stack spacing={2}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={100} />
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh', pb: { xs: 8, md: 0 } }}>
      {/* Enhanced App Bar */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <DashboardIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 600
            }}
          >
            Admin Dashboard
          </Typography>
          {!isMobile && (
            <>
              <Button 
                color="primary" 
                onClick={() => navigate('/')} 
                startIcon={<HomeIcon />}
                sx={{ mr: 2 }}
              >
                Home
              </Button>
              <Button 
                color="primary" 
                onClick={loadData} 
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </>
          )}
          {isMobile && (
            <IconButton onClick={loadData} color="primary">
              <Refresh />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {/* Mobile/Desktop Navigation */}
        {!isMobile ? (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab 
                icon={<AnalyticsIcon />} 
                label="Analytics" 
                iconPosition="start" 
              />
              <Tab 
                icon={<ReviewsIcon />} 
                label="Reviews Management" 
                iconPosition="start" 
              />
            </Tabs>
          </Box>
        ) : null}

        <TabPanel value={tabValue} index={0}>
          {/* Enhanced Analytics Tab */}
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            Analytics Overview
          </Typography>
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              lg: 'repeat(4, 1fr)' 
            },
            gap: 2,
            mb: 4 
          }}>
            <EnhancedStatsCard
              title="Total Reviews"
              value={stats?.total_reviews || 0}
              icon={<ReviewsIcon />}
              trend={getTrendData(stats?.total_reviews || 0, 'reviews')}
              color="info"
            />
            <EnhancedStatsCard
              title="Average Rating"
              value={`${stats?.average_rating || 0}/5`}
              icon={<Star />}
              trend={getTrendData(stats?.average_rating || 0, 'rating')}
              color="warning"
            />
            <EnhancedStatsCard
              title="5 Star Reviews"
              value={stats?.rating_breakdown[5] || 0}
              icon={<Star />}
              trend={getTrendData(stats?.rating_breakdown[5] || 0, 'reviews')}
              color="success"
            />
            <EnhancedStatsCard
              title="Recent Reviews"
              value={reviews.filter(r => new Date(r.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length}
              icon={<Event />}
              trend={getTrendData(reviews.filter(r => new Date(r.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length, 'reviews')}
              color="primary"
            />
          </Box>

          {/* Rating Breakdown Chart */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Rating Distribution
              </Typography>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(5, 1fr)', sm: 'repeat(5, 1fr)' },
                gap: 2,
                mt: 2
              }}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Box key={rating} sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {stats?.rating_breakdown[rating] || 0}
                    </Typography>
                    <Rating value={rating} readOnly size="small" sx={{ my: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      {rating} Star{rating !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Enhanced Reviews Management Tab */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Reviews Management
            </Typography>
            
            {/* Search and Filters */}
            <TextField
              fullWidth
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      ×
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {filteredReviews.length} of {reviews.length} reviews
            </Typography>
          </Box>

          {/* Responsive Reviews Display */}
          {isMobile ? (
            /* Mobile: Card Layout */
            <Stack spacing={2}>
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </Stack>
          ) : (
            /* Desktop: Table Layout */
            <Card>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reviewer</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Comment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                              {review.reviewer_name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {review.reviewer_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Rating value={review.rating} readOnly size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              maxWidth: 200, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {review.comment}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {review.is_approved && (
                              <Chip label="Approved" color="success" size="small" />
                            )}
                            {review.is_featured && (
                              <Chip label="Featured" color="primary" size="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(review.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleViewReview(review)}
                            size="small"
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {filteredReviews.length === 0 && !loading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {searchTerm ? 'No reviews found matching your search.' : 'No reviews found.'}
            </Alert>
          )}
        </TabPanel>
      </Container>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            borderTop: 1,
            borderColor: 'divider'
          }} 
          elevation={8}
        >
          <BottomNavigation
            value={tabValue}
            onChange={(event, newValue) => {
              if (newValue === 2) {
                navigate('/');
              } else {
                setTabValue(newValue);
              }
            }}
            showLabels
          >
            <BottomNavigationAction 
              label="Analytics" 
              icon={<AnalyticsIcon />} 
            />
            <BottomNavigationAction 
              label="Reviews" 
              icon={<ReviewsIcon />} 
            />
            <BottomNavigationAction 
              label="Home" 
              icon={<HomeIcon />} 
            />
          </BottomNavigation>
        </Paper>
      )}

      {/* Enhanced Review Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Review Details
            {isMobile && (
              <IconButton onClick={handleCloseDialog}>
                ×
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              {/* Reviewer Info */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
                  {selectedReview.reviewer_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedReview.reviewer_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Rating value={selectedReview.rating} readOnly />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {formatDate(selectedReview.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Review Content */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Review Comment
                </Typography>
                <Typography variant="body1">
                  "{selectedReview.comment}"
                </Typography>
              </Box>

              {/* Technical Details */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Review ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedReview.id}
                </Typography>
              </Box>

              {/* Status */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedReview.is_approved && (
                    <Chip label="Approved" color="success" />
                  )}
                  {selectedReview.is_featured && (
                    <Chip label="Featured" color="primary" />
                  )}
                  {selectedReview.is_anonymous && (
                    <Chip label="Anonymous" color="default" />
                  )}
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;