"""
Synthetic Training Data Generator for Passenger Demand Prediction
Generates realistic historical passenger boarding/alighting data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

def generate_synthetic_data(num_days=90, num_stops=10):
    """
    Generate synthetic passenger data for training
    
    Args:
        num_days: Number of days of historical data
        num_stops: Number of stops in the route
    
    Returns:
        DataFrame with passenger boarding/alighting data
    """
    data = []
    
    # Define stop characteristics
    stop_types = ['residential', 'commercial', 'transit_hub', 'residential', 'commercial',
                  'residential', 'commercial', 'transit_hub', 'residential', 'terminal']
    
    for day in range(num_days):
        date = datetime.now() - timedelta(days=num_days - day)
        day_of_week = date.weekday()
        is_weekend = day_of_week >= 5
        
        # Operating hours: 6 AM to 11 PM
        for hour in range(6, 23):
            for stop_id in range(num_stops):
                stop_type = stop_types[stop_id]
                
                # Calculate base demand based on stop type and time
                base_boarding = calculate_base_demand(
                    stop_type, hour, day_of_week, is_weekend, stop_id, num_stops
                )
                
                # Add realistic variance
                boarding = max(0, int(np.random.normal(base_boarding, base_boarding * 0.3)))
                alighting = max(0, int(np.random.normal(base_boarding * 0.7, base_boarding * 0.25)))
                
                # Calculate features
                is_peak = hour in [7, 8, 9, 17, 18, 19]
                stop_sequence = stop_id / (num_stops - 1)  # Normalized 0-1
                
                # Simulate current occupancy (cumulative effect)
                current_occupancy = min(40, max(0, int(np.random.normal(20, 8))))
                
                # Historical average (7-day moving average simulation)
                historical_avg = base_boarding + np.random.normal(0, 1)
                
                data.append({
                    'timestamp': date.replace(hour=hour, minute=0, second=0),
                    'stop_id': stop_id,
                    'stop_type': stop_type,
                    'hour': hour,
                    'day_of_week': day_of_week,
                    'is_weekend': is_weekend,
                    'is_peak_hour': is_peak,
                    'current_occupancy': current_occupancy,
                    'stop_sequence': stop_sequence,
                    'historical_avg': historical_avg,
                    'boardings': boarding,
                    'alightings': alighting
                })
    
    df = pd.DataFrame(data)
    return df

def calculate_base_demand(stop_type, hour, day_of_week, is_weekend, stop_id, num_stops):
    """Calculate base passenger demand based on context"""
    
    # Base demand by stop type
    base_by_type = {
        'residential': 5,
        'commercial': 8,
        'transit_hub': 12,
        'terminal': 15
    }
    base = base_by_type.get(stop_type, 5)
    
    # Time of day multiplier
    if hour in [7, 8, 9]:  # Morning peak
        time_mult = 2.0 if stop_type == 'residential' else 1.5
    elif hour in [17, 18, 19]:  # Evening peak
        time_mult = 1.5 if stop_type == 'residential' else 2.0
    elif hour in [12, 13]:  # Lunch hour
        time_mult = 1.3 if stop_type == 'commercial' else 1.0
    elif hour < 7 or hour > 20:  # Off-peak
        time_mult = 0.4
    else:
        time_mult = 1.0
    
    # Weekend reduction
    if is_weekend:
        time_mult *= 0.6
    
    # Position in route (first/last stops have more activity)
    if stop_id == 0 or stop_id == num_stops - 1:
        position_mult = 1.3
    else:
        position_mult = 1.0
    
    return base * time_mult * position_mult

def save_training_data(df, filepath='training_data.csv'):
    """Save generated data to CSV"""
    df.to_csv(filepath, index=False)
    print(f"[SUCCESS] Generated {len(df)} training samples")
    print(f"[INFO] Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"[INFO] Avg boardings: {df['boardings'].mean():.2f}")
    print(f"[INFO] Avg alightings: {df['alightings'].mean():.2f}")
    return filepath

if __name__ == '__main__':
    print("[SYSTEM] Generating synthetic training data...")
    
    # Generate 180 days of data (increased from 90 for better accuracy)
    df = generate_synthetic_data(num_days=180, num_stops=10)
    
    # Save to file
    save_training_data(df, 'training_data.csv')
    
    # Display sample
    print("\n[DATA] Sample data:")
    print(df.head(10))
    
    # Statistics
    print("\n[STATISTICS] Data Statistics:")
    print(df[['boardings', 'alightings', 'current_occupancy']].describe())
