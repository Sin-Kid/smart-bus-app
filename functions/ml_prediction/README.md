# ML Prediction Service

Python-based Random Forest passenger demand prediction service.

## Setup

1. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

2. **Generate training data**:
```bash
python generate_data.py
```

3. **Train the model**:
```bash
python train_model.py
```

4. **Start the API server**:
```bash
python api.py
```

The API will run on `http://localhost:5000`

## API Endpoints

### POST /predict
Predict passenger demand for a specific context.

**Request**:
```json
{
  "stop_id": 3,
  "hour": 8,
  "day_of_week": 0,
  "is_peak_hour": true,
  "current_occupancy": 15,
  "stop_sequence": 0.3,
  "historical_avg": 8.5
}
```

**Response**:
```json
{
  "status": "success",
  "prediction": {
    "expected_boarding": 12,
    "expected_alighting": 8,
    "confidence_boarding": 87,
    "confidence_alighting": 85
  }
}
```

### GET /metrics
Get model performance metrics (MAE, RMSE, R², MAPE).

### GET /feature-importance
Get feature importance scores for both models.

### GET /health
Health check endpoint.

## Model Details

- **Algorithm**: Random Forest Regressor
- **Trees**: 100
- **Max Depth**: 10
- **Features**: 7 (stop_id, hour, day_of_week, is_peak_hour, current_occupancy, stop_sequence, historical_avg)
- **Targets**: 2 (boardings, alightings)

## Files

- `generate_data.py` - Synthetic training data generator
- `train_model.py` - Random Forest model trainer
- `api.py` - Flask API server
- `requirements.txt` - Python dependencies
- `models/` - Saved trained models
- `training_data.csv` - Generated training dataset

