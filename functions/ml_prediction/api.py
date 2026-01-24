"""
Flask API for Real-Time Passenger Demand Prediction
Serves Random Forest model predictions via REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from train_model import PassengerDemandPredictor
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for admin web

# Load trained model
predictor = PassengerDemandPredictor()

# Try to load existing model, otherwise train new one
try:
    predictor.load_model('models/')
    print("[SUCCESS] Loaded existing model")
except:
    print("[WARNING] No existing model found. Please train first.")
    print("   Run: python generate_data.py && python train_model.py")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': hasattr(predictor, 'model_boarding'),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict passenger demand
    
    Request body:
    {
        "stop_id": 3,
        "hour": 8,
        "day_of_week": 0,
        "is_peak_hour": true,
        "current_occupancy": 15,
        "stop_sequence": 0.3,
        "historical_avg": 8.5
    }
    """
    try:
        data = request.json
        
        # Extract features
        stop_id = data.get('stop_id', 0)
        hour = data.get('hour', datetime.now().hour)
        day_of_week = data.get('day_of_week', datetime.now().weekday())
        is_peak_hour = data.get('is_peak_hour', hour in [7, 8, 9, 17, 18, 19])
        current_occupancy = data.get('current_occupancy', 20)
        stop_sequence = data.get('stop_sequence', 0.5)
        historical_avg = data.get('historical_avg', 5.0)
        
        # Make prediction
        result = predictor.predict(
            stop_id=stop_id,
            hour=hour,
            day_of_week=day_of_week,
            is_peak_hour=int(is_peak_hour),
            current_occupancy=current_occupancy,
            stop_sequence=stop_sequence,
            historical_avg=historical_avg
        )
        
        return jsonify({
            'status': 'success',
            'prediction': result,
            'context': {
                'stop_id': stop_id,
                'hour': hour,
                'is_peak_hour': bool(is_peak_hour)
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get model performance metrics"""
    if hasattr(predictor, 'metrics'):
        return jsonify({
            'status': 'success',
            'metrics': predictor.metrics
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Model not trained yet'
        }), 404

@app.route('/feature-importance', methods=['GET'])
def feature_importance():
    """Get feature importance scores"""
    if 'feature_importance' in predictor.metrics:
        return jsonify({
            'status': 'success',
            'features': predictor.metrics['feature_importance']
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Feature importance not available'
        }), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n[API] ML Prediction API running on port {port}")
    print(f"[ENDPOINTS] Available endpoints:")
    print(f"   POST /predict - Make predictions")
    print(f"   GET  /metrics - Model performance")
    print(f"   GET  /feature-importance - Feature analysis")
    print(f"   GET  /health - Health check")
    
    app.run(host='0.0.0.0', port=port, debug=True)
