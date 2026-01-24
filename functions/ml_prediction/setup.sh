#!/bin/bash

# ML Prediction Service Setup Script

echo "[SETUP] Setting up ML Prediction Service..."
echo "======================================"

# Check Python version
python3 --version || { echo "[ERROR] Python 3 not found. Please install Python 3.8+"; exit 1; }

# Install dependencies
echo ""
echo "[INSTALL] Installing Python dependencies..."
pip3 install -r requirements.txt

# Generate training data
echo ""
echo "[DATA] Generating synthetic training data..."
python3 generate_data.py

# Train model
echo ""
echo "[TRAIN] Training Random Forest models..."
python3 train_model.py

echo ""
echo "[SUCCESS] Setup complete!"
echo ""
echo "To start the API server, run:"
echo "  python3 api.py"
echo ""
echo "The API will be available at: http://localhost:5000"

