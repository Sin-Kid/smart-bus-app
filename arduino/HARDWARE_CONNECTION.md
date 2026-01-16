# Hardware Connection Guide (ESP8266)

This guide explains how to wire the ESP8266 (NodeMCU / WeMos D1 Mini) to the RFID readers and GPS module.

## Components Needed
- 1x ESP8266 (NodeMCU)
- 2x RC522 RFID Readers (1 for Entry, 1 for Exit)
- 1x NEO-6M GPS Module
- Jumper Wires & Breadboard

## Wiring Diagram

### 1. RFID Reader "ENTRY" (RC522)
| Pin on RC522 | Pin on ESP8266 | Function |
| :--- | :--- | :--- |
| **SDA (SS)** | **D2** (GPIO 4) | Chip Select |
| **SCK** | **D5** (GPIO 14) | SPI Clock |
| **MOSI** | **D7** (GPIO 13) | SPI MOSI |
| **MISO** | **D6** (GPIO 12) | SPI MISO |
| **RST** | **D1** (GPIO 5) | Reset |
| GND | GND | Ground |
| 3.3V | 3.3V | Power |

### 2. RFID Reader "EXIT" (RC522)
*Shares SCK, MOSI, MISO lines with the Entry reader.*

| Pin on RC522 | Pin on ESP8266 | Function |
| :--- | :--- | :--- |
| **SDA (SS)** | **D8** (GPIO 15) | Chip Select (Unique) |
| **SCK** | **D5** (GPIO 14) | Shared |
| **MOSI** | **D7** (GPIO 13) | Shared |
| **MISO** | **D6** (GPIO 12) | Shared |
| **RST** | **D0** (GPIO 16) | Reset (Unique) |
| GND | GND | Shared |
| 3.3V | 3.3V | Shared |

### 3. GPS Module (NEO-6M)
| Pin on GPS | Pin on ESP8266 | Function |
| :--- | :--- | :--- |
| **VCC** | 3.3V / 5V | Power (Check your module specs) |
| **GND** | GND | Ground |
| **TX** | **D4** (GPIO 2) | Data to ESP |
| **RX** | **D3** (GPIO 0) | Data from ESP |

---

## Setup Instructions

1.  **Install Libraries**:
    - Open Arduino IDE.
    - Go to **Sketch** > **Include Library** > **Manage Libraries**.
    - Install:
        - `MFRC522` by GithubCommunity
        - `ArduinoJson` by Benoit Blanchon
        - `TinyGPSPlus` by Mikal Hart

2.  **Configure Code**:
    - Open `arduino/code1/code1.ino`.
    - Update `WIFI_SSID` and `WIFI_PASS` with your WiFi details.
    - Update `SUPABASE_URL` and `SUPABASE_KEY` with your project details.

3.  **Upload**:
    - Select Board: "NodeMCU 1.0 (ESP-12E Module)".
    - Select Port.
    - Click **Upload**.
