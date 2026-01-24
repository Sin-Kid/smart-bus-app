"""
Random Forest Passenger Demand Prediction Model
Trains and predicts passenger boarding/alighting patterns
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
from datetime import datetime

class PassengerDemandPredictor:
    """Random Forest-based passenger demand prediction"""
    
    def __init__(self):
        # Separate models for boarding and alighting
        # Optimized hyperparameters for higher accuracy
        self.model_boarding = RandomForestRegressor(
            n_estimators=200,  # Increased from 100
            max_depth=15,      # Increased from 10
            min_samples_split=3,  # Reduced from 5
            min_samples_leaf=1,   # Reduced from 2
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        
        self.model_alighting = RandomForestRegressor(
            n_estimators=200,  # Increased from 100
            max_depth=15,      # Increased from 10
            min_samples_split=3,  # Reduced from 5
            min_samples_leaf=1,   # Reduced from 2
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        
        self.feature_names = [
            'stop_id', 'hour', 'day_of_week', 'is_peak_hour',
            'current_occupancy', 'stop_sequence', 'historical_avg'
        ]
        
        self.metrics = {}
        
    def engineer_features(self, df):
        """Extract features from dataframe"""
        X = df[self.feature_names].copy()
        
        # Ensure numeric types
        X['stop_id'] = X['stop_id'].astype(int)
        X['hour'] = X['hour'].astype(int)
        X['day_of_week'] = X['day_of_week'].astype(int)
        X['is_peak_hour'] = X['is_peak_hour'].astype(int)
        
        return X
    
    def train(self, data_path='training_data.csv'):
        """Train both models on historical data"""
        print("[TRAINING] Loading training data...")
        df = pd.read_csv(data_path)
        
        print(f"[INFO] Dataset: {len(df)} samples")
        
        # Prepare features and targets
        X = self.engineer_features(df)
        y_boarding = df['boardings']
        y_alighting = df['alightings']
        
        # Train-test split
        X_train, X_test, y_b_train, y_b_test, y_a_train, y_a_test = train_test_split(
            X, y_boarding, y_alighting, test_size=0.2, random_state=42
        )
        
        print("\n[TRAINING] Training Random Forest models...")
        
        # Train boarding model
        print("  [MODEL] Training boarding predictor...")
        self.model_boarding.fit(X_train, y_b_train)
        
        # Train alighting model
        print("  [MODEL] Training alighting predictor...")
        self.model_alighting.fit(X_train, y_a_train)
        
        # Evaluate models
        print("\n[EVALUATION] Evaluating models...")
        self.evaluate(X_test, y_b_test, y_a_test)
        
        # Feature importance
        self.analyze_feature_importance()
        
        return self.metrics
    
    def evaluate(self, X_test, y_b_test, y_a_test):
        """Evaluate model performance"""
        # Boarding predictions
        y_b_pred = self.model_boarding.predict(X_test)
        
        # Alighting predictions
        y_a_pred = self.model_alighting.predict(X_test)
        
        # Calculate metrics for boarding
        self.metrics['boarding'] = {
            'mae': mean_absolute_error(y_b_test, y_b_pred),
            'rmse': np.sqrt(mean_squared_error(y_b_test, y_b_pred)),
            'r2': r2_score(y_b_test, y_b_pred),
            'mape': np.mean(np.abs((y_b_test - y_b_pred) / (y_b_test + 1))) * 100
        }
        
        # Calculate metrics for alighting
        self.metrics['alighting'] = {
            'mae': mean_absolute_error(y_a_test, y_a_pred),
            'rmse': np.sqrt(mean_squared_error(y_a_test, y_a_pred)),
            'r2': r2_score(y_a_test, y_a_pred),
            'mape': np.mean(np.abs((y_a_test - y_a_pred) / (y_a_test + 1))) * 100
        }
        
        # Print results
        print("\n[RESULTS] Boarding Model Performance:")
        print(f"   MAE:  {self.metrics['boarding']['mae']:.2f}")
        print(f"   RMSE: {self.metrics['boarding']['rmse']:.2f}")
        print(f"   R²:   {self.metrics['boarding']['r2']:.3f}")
        print(f"   MAPE: {self.metrics['boarding']['mape']:.1f}%")
        
        print("\n[RESULTS] Alighting Model Performance:")
        print(f"   MAE:  {self.metrics['alighting']['mae']:.2f}")
        print(f"   RMSE: {self.metrics['alighting']['rmse']:.2f}")
        print(f"   R²:   {self.metrics['alighting']['r2']:.3f}")
        print(f"   MAPE: {self.metrics['alighting']['mape']:.1f}%")
    
    def analyze_feature_importance(self):
        """Analyze and display feature importance"""
        importance_b = self.model_boarding.feature_importances_
        importance_a = self.model_alighting.feature_importances_
        
        self.metrics['feature_importance'] = {
            name: {
                'boarding': float(imp_b),
                'alighting': float(imp_a)
            }
            for name, imp_b, imp_a in zip(self.feature_names, importance_b, importance_a)
        }
        
        print("\n[ANALYSIS] Feature Importance (Boarding):")
        for name, imp in sorted(zip(self.feature_names, importance_b), key=lambda x: x[1], reverse=True):
            print(f"   {name:20s}: {imp:.3f}")
    
    def predict(self, stop_id, hour, day_of_week, is_peak_hour, 
                current_occupancy, stop_sequence, historical_avg):
        """
        Predict passenger demand for a specific context
        
        Returns:
            dict with boarding and alighting predictions
        """
        # Create feature vector
        features = np.array([[
            stop_id, hour, day_of_week, is_peak_hour,
            current_occupancy, stop_sequence, historical_avg
        ]])
        
        # Predict
        boarding_pred = self.model_boarding.predict(features)[0]
        alighting_pred = self.model_alighting.predict(features)[0]
        
        # Ensure non-negative predictions
        boarding_pred = max(0, int(round(boarding_pred)))
        alighting_pred = max(0, int(round(alighting_pred)))
        
        return {
            'expected_boarding': boarding_pred,
            'expected_alighting': alighting_pred,
            'confidence_boarding': self.calculate_confidence(boarding_pred),
            'confidence_alighting': self.calculate_confidence(alighting_pred)
        }
    
    def calculate_confidence(self, prediction):
        """Calculate prediction confidence (simplified)"""
        # Based on model R² score
        if 'boarding' in self.metrics:
            r2 = self.metrics['boarding']['r2']
            return int(r2 * 100)
        return 85  # Default
    
    def save_model(self, path='models/'):
        """Save trained models"""
        import os
        os.makedirs(path, exist_ok=True)
        
        joblib.dump(self.model_boarding, f'{path}boarding_model.pkl')
        joblib.dump(self.model_alighting, f'{path}alighting_model.pkl')
        
        # Save metrics
        with open(f'{path}metrics.json', 'w') as f:
            json.dump(self.metrics, f, indent=2)
        
        print(f"\n[SAVE] Models saved to {path}")
    
    def load_model(self, path='models/'):
        """Load trained models"""
        self.model_boarding = joblib.load(f'{path}boarding_model.pkl')
        self.model_alighting = joblib.load(f'{path}alighting_model.pkl')
        
        # Load metrics
        with open(f'{path}metrics.json', 'r') as f:
            self.metrics = json.load(f)
        
        print(f"[LOAD] Models loaded from {path}")

if __name__ == '__main__':
    print("[SYSTEM] Random Forest Passenger Demand Prediction")
    print("=" * 50)
    
    # Initialize predictor
    predictor = PassengerDemandPredictor()
    
    # Train model
    metrics = predictor.train('training_data.csv')
    
    # Save model
    predictor.save_model()
    
    # Test prediction
    print("\n[TEST] Test Prediction:")
    print("   Context: Stop 3, 8 AM, Monday, Peak Hour")
    result = predictor.predict(
        stop_id=3,
        hour=8,
        day_of_week=0,  # Monday
        is_peak_hour=1,
        current_occupancy=15,
        stop_sequence=0.3,
        historical_avg=8.5
    )
    print(f"   Predicted Boarding: {result['expected_boarding']} passengers")
    print(f"   Predicted Alighting: {result['expected_alighting']} passengers")
    print(f"   Confidence: {result['confidence_boarding']}%")
