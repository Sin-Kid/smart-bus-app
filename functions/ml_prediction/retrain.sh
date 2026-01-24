#!/bin/bash

# Manual Model Retraining Script
# Run this script whenever you want to retrain the model with fresh data

echo "[RETRAIN] Starting model retraining..."
echo "=========================================="

# Navigate to ML prediction directory
cd "$(dirname "$0")"

# Backup old model if exists
if [ -d "models" ]; then
    BACKUP_DIR="models_backup_$(date +%Y%m%d_%H%M%S)"
    echo "[BACKUP] Backing up existing models to $BACKUP_DIR"
    cp -r models "$BACKUP_DIR"
fi

# Generate fresh training data
echo ""
echo "[DATA] Generating fresh training data..."
python3 generate_data.py

# Train new model
echo ""
echo "[TRAIN] Training Random Forest models with fresh data..."
python3 train_model.py

echo ""
echo "[SUCCESS] Model retraining complete!"
echo ""
echo "To use the new model, restart the API server:"
echo "  pkill -f 'python3 api.py'"
echo "  PORT=5001 python3 api.py"
echo ""
