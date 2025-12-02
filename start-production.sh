#!/bin/bash

echo "🚀 Starting Doctor Appointment System - Production Deployment"
echo "=============================================================="

# Build frontend
echo "📦 Building frontend for production..."
cd frontend
npm run build
cd ..

# Set production environment
export NODE_ENV=production

# Start production server
echo "🖥️  Starting production server..."
echo "📍 Backend API: http://localhost:3000/api/"
echo "🌐 Frontend App: http://localhost:3000/"
echo "📊 Admin Dashboard: http://localhost:3000/admin"
echo "👨‍⚕️ Doctor Portal: http://localhost:3000/doctor"
echo "👤 Patient Portal: http://localhost:3000/patient"
echo ""
echo "✅ Application ready for production use!"
echo "=============================================================="

node server.js