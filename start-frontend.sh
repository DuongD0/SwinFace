#!/bin/bash
# Start React Frontend

echo "Starting SwinFace Frontend..."
echo "============================="

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the frontend
echo "Starting Vite dev server on port 5173..."
npm run dev

