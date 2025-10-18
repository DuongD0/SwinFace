#!/bin/bash
# Start Python FastAPI Service

echo "Starting SwinFace Python Service..."
echo "=================================="

# Check if conda environment exists
if ! conda env list | grep -q "SwinFaceMotion"; then
    echo "Error: Conda environment 'SwinFaceMotion' not found."
    echo "Please run: conda env create -f environment.yml"
    exit 1
fi

# Activate conda environment
source $(conda info --base)/etc/profile.d/conda.sh
conda activate SwinFaceMotion

# Check if in correct directory
if [ ! -f "main.py" ]; then
    cd python-service
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Using default configuration."
fi

# Start the service
echo "Starting FastAPI service on port 8000..."
python main.py

