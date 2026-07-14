#!/usr/bin/env python3
import matplotlib.pyplot as plt
import numpy as np

def generate_table_image(output_path="ai_benchmark_table.png"):
    # Define table data
    headers = [
        "Dimension", 
        "RFID + ESP8266 Hardware\n(Our Implemented System)", 
        "Computer Vision\n(YOLOv8 - Alternate)", 
        "Deep Learning\n(LSTM - Alternate)"
    ]
    data = [
        ["Core Objective", "Real-world passenger counting & automatic\nticketing via RFID scans. Backend forecasts\npassenger demand at stops.", "Real-time passenger counting\n& seat occupancy validation.", "Long-term sequence forecasting\n(crowd/congestion trends)."],
        ["Primary Inputs", "Physical RFID taps, GPS coordinates, and\ntabular logs (stop_id, occupancy, peak hour).", "Live video streams from\nonboard passenger cabin/doors.", "Historical passenger flow\nsequences (hourly/daily)."],
        ["Model / Tech Type", "ESP8266 Firmware (C++) + Two\nRandomForestRegressors in Cloud.", "Deep Convolutional Neural Network\n(YOLOv8-nano/small).", "Recurrent Neural Network\n(LSTM or GRU cells)."],
        ["Inference Latency", "< 5 ms (Cloud Flask execution);\nReal-time hardware tap response.", "30 - 50 ms\n(GPU-dependent inference).", "10 - 20 ms\n(Fast CPU/GPU execution)."],
        ["Accuracy Profile", "Hardware: 100% exact ticketing scans.\nML: R² = 0.73 - 0.77 (demand prediction).", "mAP@0.5 ~ 0.94 - 0.96\n(High-accuracy counts).", "RMSE ~ 1.5 - 2.8 passengers\n(Excellent trend matching)."],
        ["Compute Cost", "Very Low (Runs on standard micro-servers;\nMicrocontroller runs lightweight C++).", "Very High\n(Requires constant GPU compute).", "Medium\n(Trained on GPU, runs on CPU)."],
        ["Hardware Overhead", "Very Low & Cheap (ESP8266 NodeMCU,\nRC522 RFID, NEO-6M GPS).", "High ($100-$300/bus for\ncameras + Edge AI processor).", "None\n(Cloud-hosted database API)."],
        ["Privacy (GDPR)", "Excellent\n(Anonymized card UID hashes only).", "Low\n(Processes video of commuters).", "Excellent\n(Uses aggregated numbers)."],
        ["Deployment", "ESP8266 firmware (code1.ino) communicating\nvia HTTPS to Supabase & Flask API (api.py).", "Edge AI firmware communicating via HTTP/\nWebSocket protocol to dashboard server.", "Cloud API service communicating via HTTP\nREST requests to DB/Admin portal."]
    ]

    # Plot size
    fig, ax = plt.subplots(figsize=(15, 9), dpi=300)
    ax.axis('off')
    
    # Create the table
    # Custom column widths to ensure text fits without clipping
    col_widths = [0.18, 0.27, 0.28, 0.27]
    table = ax.table(
        cellText=data,
        colLabels=headers,
        colWidths=col_widths,
        loc='center',
        cellLoc='left'
    )
    
    # Custom Table Styling
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    
    # Apply custom padding and colors cell by cell
    for (row_idx, col_idx), cell in table.get_celld().items():
        cell.set_text_props(verticalalignment='center')
        
        # Header Row Styling
        if row_idx == 0:
            cell.set_text_props(color='white', weight='bold', horizontalalignment='center')
            cell.set_facecolor('#1e293b')  # Slate 800
            cell.set_height(0.08)
            cell.set_edgecolor('#0f172a')
        else:
            # Data Rows Styling
            # Height
            cell.set_height(0.09)
            cell.set_edgecolor('#cbd5e1') # Slate 300
            
            # Zebra striping
            if row_idx % 2 == 0:
                cell.set_facecolor('#f8fafc') # Slate 50
            else:
                cell.set_facecolor('white')
                
            # Highlight first column (Dimension)
            if col_idx == 0:
                cell.set_text_props(weight='bold', color='#1e293b')
                cell.set_facecolor('#f1f5f9') # Slate 100
                cell.set_text_props(horizontalalignment='center')
                
    # Add title
    plt.title("Smart Bus System - AI Technologies Benchmarks & Trade-Offs", 
              fontsize=16, fontweight='bold', color='#0f172a', pad=25)
    
    # Adjust layout and save
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Table image generated successfully: {output_path}")

if __name__ == "__main__":
    generate_table_image()
