#!/bin/bash
# Start Node.js Backend

echo "Starting SwinFace Backend..."
echo "============================"

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Using default configuration."
fi

# Start the backend
echo "Starting Express server on port 3000..."
npm start

