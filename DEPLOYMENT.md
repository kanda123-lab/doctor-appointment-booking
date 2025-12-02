# Doctor Appointment System - Deployment Guide

## 📋 Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- Git

## 🚀 Production Deployment Steps

### 1. Clone the Repository

```bash
git clone https://github.com/kanda123-lab/doctor-appointment-booking.git
cd doctor-appointment-booking
```

### 2. Backend Setup

```bash
# Install backend dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your production values:
# - DATABASE_URL
# - JWT_SECRET
# - TWILIO_ACCOUNT_SID (optional)
# - TWILIO_AUTH_TOKEN (optional)
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Initialize database with sample data (optional)
npm run db:init
```

### 4. Frontend Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Build production frontend
npm run build
```

### 5. Start Production Server

```bash
# From root directory
npm start
```

The backend server will start on port 3000 and serve both API and frontend static files.

## 🌐 Application URLs

- **Frontend**: http://localhost:3000/
- **API Endpoints**: http://localhost:3000/api/
- **Admin Dashboard**: http://localhost:3000/admin
- **Patient Portal**: http://localhost:3000/patient  
- **Doctor Portal**: http://localhost:3000/doctor

## 📊 Features Deployed

### Core System
- ✅ Patient registration and dashboard
- ✅ Doctor portal with appointment management
- ✅ Queue management system
- ✅ Real-time notifications
- ✅ Mobile-responsive design

### Review System
- ✅ Patient review submission with ratings (1-5 stars)
- ✅ Review display and management
- ✅ Admin dashboard for review moderation
- ✅ Review statistics and analytics
- ✅ Featured reviews functionality

### Admin Features
- ✅ Comprehensive admin dashboard
- ✅ Review management with approve/feature options
- ✅ System analytics and statistics
- ✅ Mobile-optimized admin interface

## 🔧 Production Configuration

### Environment Variables
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://username:password@host:port/database
JWT_SECRET=your_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Database Tables
- `users` - User authentication
- `patients` - Patient profiles
- `doctors` - Doctor profiles
- `appointments` - Appointment management
- `queue_history` - Queue tracking
- `reviews` - Patient reviews and ratings

## 📱 Mobile-First Design

The application is optimized for mobile devices with:
- Responsive breakpoints for all screen sizes
- Touch-friendly interface elements
- Mobile-optimized navigation
- Progressive enhancement for larger screens

## 🔒 Security Features

- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Helmet security headers
- Rate limiting (recommended for production)

## 📈 Monitoring and Maintenance

### Health Checks
```bash
# Check database connectivity
npm run db:health

# Run tests
npm test

# Check application logs
tail -f logs/combined.log
```

### Database Maintenance
```bash
# Reset database (development only)
npm run db:reset

# Re-run migrations
npm run db:migrate
```

## 🚀 Deployment Platforms

This application can be deployed on:
- **Heroku** - Add Heroku Postgres addon
- **Vercel** - For frontend + serverless functions
- **Railway** - Full-stack deployment
- **DigitalOcean** - VPS deployment
- **AWS** - EC2 + RDS setup

## 📞 Support

For deployment issues or questions, check:
1. Application logs in `logs/` directory
2. Database connection status
3. Environment variable configuration
4. Port availability (default: 3000)

---

**Last Updated**: December 2025  
**Version**: 1.0.0 with Review System