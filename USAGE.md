# User Guide & Workflows

This guide explains how to use the features of the Smart Bus System once you have it up and running.

---

## Admin Dashboard (`admin-web`)

The Admin Web is the control center. Use it to manage the fleet and simulate bus movements.

### 1. Simulation & Live Status
*Perfect for testing without real hardware.*

1.  Navigate to the **Status** (or Home) page.
2.  **Select a Bus** from the dropdown menu.
3.  **Manual Controls**:
    - **Current Stop**: Choose where the bus is right now.
    - **Occupied Seats**: Manually set how many people are on the bus (e.g., 35).
    - **Total Capacity**: Set the max seats (e.g., 50).
    - **Simulate Leaving**: Check this if the bus is just leaving the stop.
4.  Click **Update Status**. 
    - *Result*: The User App will immediately show the new seat count and location.

### 2. Route Management
1.  Go to the **Routes** page.
2.  Click **Create New Route**.
3.  Enter Route Number (e.g., `500-D`) and Name.
4.  **Add Stops**:
    - Click **Add Stop**.
    - Enter Stop Name (e.g., "Kengeri").
    - **Set Arrival Time**: Click the time field to use the scrollable drum picker (e.g., `09:30 AM`).
5.  Save the route.

---

## Passenger App (`expo-user-app`)

The mobile app used by everyday commuters.

### 1. Search for Buses
1.  On the Home Screen, tap **"Where is my Bus"** (or use the Find Bus tab).
2.  Enter **Source** and **Destination**.
    - *Tip*: Use the **Swap Icon** (arrows) to quickly reverse the route.
3.  Tap **Find Buses**.

### 2. Live Tracking & Occupancy
1.  Select a bus from the results list.
2.  You will see the **Live Journey Timeline**:
    - **Bus Icon**: Animation shows current location.
    - **Time**: Expected arrival time for each stop.
    - **Seats**: Real-time availability (e.g., "20 Seats Free").
    - *Note*: This data matches what you set in the Admin Dashboard!

### 3. Payment & Trips
- **Fixed Fare**: All trips currently have a flat fare of **50**.
- **Balance**: Check your card balance on the Home Screen.
- **Top Up**: Tap "Top Up" to add money to your wallet.

---

## Hardware Simulation (Optional)

If you don't have the RFID hardware connected:
- The system relies on the **Manual Simulation** controls in the Admin Dashboard to trigger updates.
- Future updates can include a "Virtual Tap" button to simulate passenger entry/exit directly from the Admin interface.
