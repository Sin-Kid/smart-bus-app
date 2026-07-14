#!/usr/bin/env python3
"""
Import MATLAB-generated data into Python ML training pipeline
Converts CSV data to format expected by train_model.py
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

print("=" * 60)
print("MATLAB Data Import for Random Forest Training")
print("=" * 60)

# File paths
MATLAB_DATA_FILE = '../matlab/bus_passenger_data_180days.csv'
RFID_LOG_FILE = '../matlab/rfid_logs_180days.csv'
OUTPUT_TRAIN_FILE = 'training_data_180days.csv'
OUTPUT_RFID_FILE = 'rfid_logs_import.csv'

def import_passenger_data():
    """Import and validate passenger data from MATLAB"""
    print("\n[1] Importing Passenger Data...")
    
    if not os.path.exists(MATLAB_DATA_FILE):
        print(f"❌ Error: {MATLAB_DATA_FILE} not found")
        print("   Please run generate_bus_data.m in MATLAB first")
        return None
    
    # Load data
    df = pd.read_csv(MATLAB_DATA_FILE)
    
    print(f"✅ Loaded {len(df)} samples")
    print(f"\nColumns: {list(df.columns)}")
    
    # Validate columns
    required_cols = ['stop_id', 'hour', 'day_of_week', 'is_peak_hour', 
                     'current_occupancy', 'stop_sequence', 'historical_avg',
                     'boarding', 'alighting']
    
    missing = set(required_cols) - set(df.columns)
    if missing:
        print(f"❌ Missing columns: {missing}")
        return None
    
    # Data validation
    print("\n📊 Data Statistics:")
    print(f"   Date range: {df['stop_id'].min()} to {df['stop_id'].max()} stops")
    print(f"   Hours: {df['hour'].min()} to {df['hour'].max()}")
    print(f"   Boarding: mean={df['boarding'].mean():.2f}, std={df['boarding'].std():.2f}")
    print(f"   Alighting: mean={df['alighting'].mean():.2f}, std={df['alighting'].std():.2f}")
    
    # Check for invalid values
    if df.isnull().any().any():
        print("⚠️  Warning: Found null values")
        df = df.dropna()
        print(f"   Dropped nulls, {len(df)} samples remaining")
    
    if (df['boarding'] < 0).any() or (df['alighting'] < 0).any():
        print("⚠️  Warning: Found negative passenger counts")
        df = df[(df['boarding'] >= 0) & (df['alighting'] >= 0)]
        print(f"   Cleaned data, {len(df)} samples remaining")
    
    # Save processed data
    df.to_csv(OUTPUT_TRAIN_FILE, index=False)
    print(f"\n✅ Training data saved to: {OUTPUT_TRAIN_FILE}")
    
    return df

def import_rfid_logs():
    """Import RFID log data"""
    print("\n[2] Importing RFID Logs...")
    
    if not os.path.exists(RFID_LOG_FILE):
        print(f"⚠️  {RFID_LOG_FILE} not found")
        print("   Run generate_rfid_logs.m to create RFID data")
        return None
    
    # Load data
    df = pd.read_csv(RFID_LOG_FILE)
    
    print(f"✅ Loaded {len(df)} RFID events")
    print(f"\nColumns: {list(df.columns)}")
    
    # Statistics
    entry_count = len(df[df['event_type'] == 'entry'])
    exit_count = len(df[df['event_type'] == 'exit'])
    
    print("\n📊 RFID Statistics:")
    print(f"   Entry events: {entry_count}")
    print(f"   Exit events: {exit_count}")
    print(f"   Unique cards: {df['card_uid'].nunique()}")
    print(f"   Buses: {df['bus_id'].unique()}")
    
    # Save for import
    df.to_csv(OUTPUT_RFID_FILE, index=False)
    print(f"\n✅ RFID logs saved to: {OUTPUT_RFID_FILE}")
    
    return df

def generate_training_summary(passenger_df):
    """Generate summary report for ML training"""
    print("\n[3] Generating Training Summary...")
    
    summary = {
        'total_samples': len(passenger_df),
        'date_range': '180 days',
        'features': list(passenger_df.columns[:-2]),  # Exclude targets
        'targets': ['boarding', 'alighting'],
        'boarding_stats': {
            'mean': float(passenger_df['boarding'].mean()),
            'std': float(passenger_df['boarding'].std()),
            'min': int(passenger_df['boarding'].min()),
            'max': int(passenger_df['boarding'].max())
        },
        'alighting_stats': {
            'mean': float(passenger_df['alighting'].mean()),
            'std': float(passenger_df['alighting'].std()),
            'min': int(passenger_df['alighting'].min()),
            'max': int(passenger_df['alighting'].max())
        }
    }
    
    print("\n📋 Training Summary:")
    print(f"   Total Samples: {summary['total_samples']}")
    print(f"   Features: {len(summary['features'])}")
    print(f"   Targets: {summary['targets']}")
    print(f"\n   Boarding: μ={summary['boarding_stats']['mean']:.2f}, "
          f"σ={summary['boarding_stats']['std']:.2f}")
    print(f"   Alighting: μ={summary['alighting_stats']['mean']:.2f}, "
          f"σ={summary['alighting_stats']['std']:.2f}")
    
    # Save summary
    import json
    with open('training_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Summary saved to: training_summary.json")
    
    return summary

def visualize_data(passenger_df):
    """Create visualization of imported data"""
    print("\n[4] Creating Visualizations...")
    
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        
        # 1. Hourly pattern
        hourly = passenger_df.groupby('hour')['boarding'].mean()
        axes[0, 0].bar(hourly.index, hourly.values, color='steelblue')
        axes[0, 0].set_xlabel('Hour of Day')
        axes[0, 0].set_ylabel('Avg Boarding')
        axes[0, 0].set_title('Hourly Boarding Pattern')
        axes[0, 0].grid(alpha=0.3)
        
        # 2. Daily pattern
        daily = passenger_df.groupby('day_of_week')['boarding'].mean()
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        axes[0, 1].bar(range(7), daily.values, color='coral')
        axes[0, 1].set_xticks(range(7))
        axes[0, 1].set_xticklabels(days)
        axes[0, 1].set_ylabel('Avg Boarding')
        axes[0, 1].set_title('Daily Boarding Pattern')
        axes[0, 1].grid(alpha=0.3)
        
        # 3. Peak vs Non-Peak
        peak_data = passenger_df[passenger_df['is_peak_hour'] == 1]['boarding']
        nonpeak_data = passenger_df[passenger_df['is_peak_hour'] == 0]['boarding']
        axes[0, 2].boxplot([nonpeak_data, peak_data], labels=['Non-Peak', 'Peak'])
        axes[0, 2].set_ylabel('Boarding Count')
        axes[0, 2].set_title('Peak vs Non-Peak')
        axes[0, 2].grid(alpha=0.3)
        
        # 4. Boarding distribution
        axes[1, 0].hist(passenger_df['boarding'], bins=30, color='green', alpha=0.7)
        axes[1, 0].set_xlabel('Boarding Count')
        axes[1, 0].set_ylabel('Frequency')
        axes[1, 0].set_title('Boarding Distribution')
        axes[1, 0].grid(alpha=0.3)
        
        # 5. Alighting distribution
        axes[1, 1].hist(passenger_df['alighting'], bins=30, color='red', alpha=0.7)
        axes[1, 1].set_xlabel('Alighting Count')
        axes[1, 1].set_ylabel('Frequency')
        axes[1, 1].set_title('Alighting Distribution')
        axes[1, 1].grid(alpha=0.3)
        
        # 6. Boarding vs Alighting
        axes[1, 2].scatter(passenger_df['boarding'], passenger_df['alighting'], 
                          alpha=0.3, s=10)
        axes[1, 2].plot([0, passenger_df['boarding'].max()], 
                       [0, passenger_df['boarding'].max()], 
                       'r--', linewidth=2)
        axes[1, 2].set_xlabel('Boarding')
        axes[1, 2].set_ylabel('Alighting')
        axes[1, 2].set_title('Boarding vs Alighting')
        axes[1, 2].grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('imported_data_analysis.png', dpi=150)
        print(f"✅ Visualization saved to: imported_data_analysis.png")
        
    except ImportError:
        print("⚠️  matplotlib not available, skipping visualization")

def main():
    """Main import workflow"""
    
    # Import passenger data
    passenger_df = import_passenger_data()
    if passenger_df is None:
        return
    
    # Import RFID logs (optional)
    rfid_df = import_rfid_logs()
    
    # Generate summary
    summary = generate_training_summary(passenger_df)
    
    # Visualize
    visualize_data(passenger_df)
    
    print("\n" + "=" * 60)
    print("✅ Data Import Complete!")
    print("=" * 60)
    print("\n📁 Files Created:")
    print(f"   1. {OUTPUT_TRAIN_FILE} - Training data")
    if rfid_df is not None:
        print(f"   2. {OUTPUT_RFID_FILE} - RFID logs")
    print(f"   3. training_summary.json - Data summary")
    print(f"   4. imported_data_analysis.png - Visualizations")
    
    print("\n🚀 Next Steps:")
    print("   1. Review the generated visualizations")
    print("   2. Run: python train_model.py")
    print("   3. Model will train on {} samples".format(len(passenger_df)))
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
