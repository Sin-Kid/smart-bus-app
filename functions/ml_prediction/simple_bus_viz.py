#!/usr/bin/env python3
"""
Simple Bus Occupancy Visualization
Shows passenger boarding/alighting with weekday/weekend patterns
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import random

# Set style
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 11

print("=" * 60)
print("SIMPLE BUS OCCUPANCY VISUALIZATION")
print("=" * 60)

# Configuration
NUM_DAYS = 30
BUS_CAPACITY = 40
start_date = datetime(2026, 1, 1)

# Generate simple data based on conditions
data = []

for day in range(NUM_DAYS):
    current_date = start_date + timedelta(days=day)
    day_of_week = current_date.weekday()
    is_weekend = day_of_week >= 5  # Saturday=5, Sunday=6
    
    # Condition 1: Weekend has less passengers (below average)
    if is_weekend:
        occupancy = random.randint(15, 25)  # Lower for weekends
        boarding = random.randint(8, 15)
        alighting = random.randint(5, 12)
    else:
        # Weekday: 25-40 passengers
        occupancy = random.randint(25, 40)
        boarding = random.randint(12, 20)
        alighting = random.randint(8, 15)
    
    data.append({
        'date': current_date,
        'day_of_week': day_of_week,
        'is_weekend': is_weekend,
        'occupancy': occupancy,
        'boarding': boarding,
        'alighting': alighting
    })

df = pd.DataFrame(data)

print(f"\n✓ Generated {len(df)} days of data")
print(f"  Weekday avg occupancy: {df[~df['is_weekend']]['occupancy'].mean():.1f}")
print(f"  Weekend avg occupancy: {df[df['is_weekend']]['occupancy'].mean():.1f}")

# Create Image 1: Daily Occupancy
fig1, ax1 = plt.subplots(figsize=(14, 6))

days = range(1, NUM_DAYS + 1)
colors = ['steelblue' if not is_weekend else 'lightblue' 
          for is_weekend in df['is_weekend']]

ax1.bar(days, df['occupancy'], color=colors, edgecolor='darkblue', linewidth=0.5)
ax1.axhline(y=BUS_CAPACITY, color='red', linestyle='--', linewidth=2, label=f'Capacity ({BUS_CAPACITY})')
ax1.axhline(y=df['occupancy'].mean(), color='green', linestyle='--', 
            linewidth=1.5, label=f'Average ({df["occupancy"].mean():.0f})')

ax1.set_xlabel('Day of Month', fontweight='bold', fontsize=12)
ax1.set_ylabel('Passengers', fontweight='bold', fontsize=12)
ax1.set_title('Daily Bus Occupancy (30 Days)', fontweight='bold', fontsize=14)
ax1.set_ylim(0, 45)
ax1.set_yticks(range(0, 45, 5))
ax1.grid(True, alpha=0.3, axis='y')
ax1.legend(loc='upper right')

# Add day names on x-axis
day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
x_labels = []
for i, row in df.iterrows():
    day_num = i + 1
    day_name = day_names[row['day_of_week']]
    x_labels.append(f"{day_num}\n{day_name}")

ax1.set_xticks(range(1, NUM_DAYS + 1))
ax1.set_xticklabels(x_labels, fontsize=8)

plt.tight_layout()
plt.savefig('image1_occupancy.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: image1_occupancy.png")
plt.close()

# Create Image 2: Entering vs Exiting
fig2, ax2 = plt.subplots(figsize=(14, 6))

x = np.arange(len(df))

# Show entering above axis, exiting below axis (mirrored)
ax2.bar(x, df['boarding'], label='Entering', 
        color='mediumseagreen', edgecolor='darkgreen', linewidth=0.5, alpha=0.8)
ax2.bar(x, -df['alighting'], label='Exiting', 
        color='coral', edgecolor='darkred', linewidth=0.5, alpha=0.8)

# Add zero line
ax2.axhline(y=0, color='black', linewidth=1)

ax2.set_xlabel('Day of Month', fontweight='bold', fontsize=12)
ax2.set_ylabel('Passengers', fontweight='bold', fontsize=12)
ax2.set_title('Daily Entering (↑) & Exiting (↓) Passengers', fontweight='bold', fontsize=14)
ax2.set_ylim(-25, 25)  # Symmetric for clarity

# Show all days on x-axis
ax2.set_xticks(range(0, NUM_DAYS))
ax2.set_xticklabels([f"{i+1}\n{day_names[df.iloc[i]['day_of_week']]}" 
                     for i in range(0, NUM_DAYS)], fontsize=7, rotation=0)

# Fix y-axis labels to show absolute values
y_ticks = range(-20, 25, 5)
ax2.set_yticks(y_ticks)
ax2.set_yticklabels([abs(y) for y in y_ticks])

ax2.legend(loc='upper right')
ax2.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig('image2_entering_exiting.png', dpi=300, bbox_inches='tight')
print(f"✓ Saved: image2_entering_exiting.png")
plt.close()

# Print summary statistics
print("\n" + "=" * 60)
print("SUMMARY STATISTICS")
print("=" * 60)
print(f"\nBus Capacity: {BUS_CAPACITY} passengers")
print(f"\nOccupancy:")
print(f"  Overall Average: {df['occupancy'].mean():.1f} passengers ({df['occupancy'].mean()/BUS_CAPACITY*100:.1f}%)")
print(f"  Weekday Average: {df[~df['is_weekend']]['occupancy'].mean():.1f} passengers")
print(f"  Weekend Average: {df[df['is_weekend']]['occupancy'].mean():.1f} passengers")
print(f"  Maximum: {df['occupancy'].max()} passengers")
print(f"  Minimum: {df['occupancy'].min()} passengers")

print(f"\nBoarding:")
print(f"  Average: {df['boarding'].mean():.1f} passengers/day")
print(f"  Weekday: {df[~df['is_weekend']]['boarding'].mean():.1f} passengers/day")
print(f"  Weekend: {df[df['is_weekend']]['boarding'].mean():.1f} passengers/day")

print(f"\nAlighting:")
print(f"  Average: {df['alighting'].mean():.1f} passengers/day")
print(f"  Weekday: {df[~df['is_weekend']]['alighting'].mean():.1f} passengers/day")
print(f"  Weekend: {df[df['is_weekend']]['alighting'].mean():.1f} passengers/day")

print("\n✅ Simple visualization complete!")
