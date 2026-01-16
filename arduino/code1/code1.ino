/*
   SMART BUS - FIRMWARE V3 (Debounce Fix)
   Board: ESP8266 (NodeMCU / WeMos D1 Mini)
   
   ================ WIRING GUIDE ================
   
   1. RFID READER 1 (ENTRY) - RC522
      - SDA (SS)  -> D2 (GPIO 4)
      - RST       -> D1 (GPIO 5)
      - SCK       -> D5 (GPIO 14)
      - MOSI      -> D7 (GPIO 13)
      - MISO      -> D6 (GPIO 12)
      - GND       -> GND
      - 3.3V      -> 3.3V

   2. RFID READER 2 (EXIT) - RC522
      - SDA (SS)  -> D8 (GPIO 15)
      - RST       -> D0 (GPIO 16)
      - SCK, MOSI, MISO, GND, 3.3V -> Shared with Reader 1

   3. GPS MODULE (NEO-6M)
      - TX        -> D4 (GPIO 2) [SoftwareSerial RX]
      - RX        -> D3 (GPIO 0) [SoftwareSerial TX]
      - VCC       -> 3.3V or 5V (Check module spec)
      - GND       -> GND

   ==============================================
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// ================= CONFIGURATION =================
// Replace with your Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* SUPABASE_URL = "YOUR_SUPABASE_URL_WITHOUT_HTTPS"; 
const char* SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"; 

const char* BUS_ID = "BUS101"; // Unique ID for this bus

// ================= PINS =================
// GPS Pins (Sortware Serial)
#define GPS_RX D4
#define GPS_TX D3

// Entry RFID Pins
#define SS_ENTRY D2
#define RST_ENTRY D1

// Exit RFID Pins
#define SS_EXIT D8
#define RST_EXIT D0

// ================= OBJECTS =================
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
TinyGPSPlus gpsParser;
MFRC522 rfidEntry(SS_ENTRY, RST_ENTRY);
MFRC522 rfidExit(SS_EXIT, RST_EXIT);

bool gpsFix = false;

// ================= DEBOUNCE VARS =================
String lastUidEntry = "";
unsigned long lastTimeEntry = 0;

String lastUidExit = "";
unsigned long lastTimeExit = 0;

const int DEBOUNCE_DELAY = 5000; // 5 Seconds ignore same card

// ================= HELPERS =================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

String uidToString(MFRC522::Uid *uid) {
  String s = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) s += "0";
    s += String(uid->uidByte[i], HEX);
  }
  s.toUpperCase(); 
  return s; 
}

void readGPS() {
  while (gpsSerial.available()) {
    gpsParser.encode(gpsSerial.read());
  }
  gpsFix = gpsParser.location.isValid();
}

double getLat() { return gpsFix ? gpsParser.location.lat() : 12.9716; }
double getLon() { return gpsFix ? gpsParser.location.lng() : 77.5946; }

// ================= API CALLS =================

void callSupabaseRPC(String funcName, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  
  String url = "https://" + String(SUPABASE_URL) + "/rest/v1/rpc/" + funcName;
  
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    
    int httpCode = http.POST(jsonPayload);
    
    if (httpCode > 0) {
      Serial.println("Server Response (" + String(httpCode) + "): " + http.getString());
    } else {
      Serial.println("HTTP Error: " + http.errorToString(httpCode));
    }
    
    http.end();
  } else {
    Serial.println("Unable to connect to Supabase");
  }
}

void handleEntry(String uid) {
  // Check Debounce
  if (uid == lastUidEntry && (millis() - lastTimeEntry < DEBOUNCE_DELAY)) {
    Serial.println("Ignored Duplicate Entry Tap: " + uid);
    return;
  }
  
  Serial.println("PROCESSING ENTRY: " + uid);
  lastUidEntry = uid;
  lastTimeEntry = millis();
  
  String json = "{";
  json += "\"p_card_uid\":\"" + uid + "\",";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_lat\":" + String(getLat(), 6) + ",";
  json += "\"p_lon\":" + String(getLon(), 6);
  json += "}";
  
  callSupabaseRPC("handle_bus_entry", json);
}

void handleExit(String uid) {
  // Check Debounce
  if (uid == lastUidExit && (millis() - lastTimeExit < DEBOUNCE_DELAY)) {
    Serial.println("Ignored Duplicate Exit Tap: " + uid);
    return;
  }
  
  Serial.println("PROCESSING EXIT: " + uid);
  lastUidExit = uid;
  lastTimeExit = millis();
  
  String json = "{";
  json += "\"p_card_uid\":\"" + uid + "\",";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_lat\":" + String(getLat(), 6) + ",";
  json += "\"p_lon\":" + String(getLon(), 6);
  json += "}";
  
  callSupabaseRPC("handle_bus_exit", json);
}

void sendTelemetry() {
  String json = "{";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_lat\":" + String(getLat(), 6) + ",";
  json += "\"p_lon\":" + String(getLon(), 6) + ",";
  json += "\"p_speed\":" + String(gpsFix ? gpsParser.speed.kmph() : 0);
  json += "}";
  
  callSupabaseRPC("handle_telemetry", json);
}

// ================= MAIN =================

void setup() {
  Serial.begin(115200);
  
  // Init Hardware
  SPI.begin();
  rfidEntry.PCD_Init();
  rfidExit.PCD_Init();
  gpsSerial.begin(9600);
  
  Serial.println("\n\n--- SMART BUS SYSTEM STARTING (V3) ---");
  
  connectWiFi();
  
  Serial.println("System Ready. Waiting for Cards...");
}

unsigned long lastTel = 0;

void loop() {
  readGPS();
  
  // 1. Check Entry Reader
  if (rfidEntry.PICC_IsNewCardPresent() && rfidEntry.PICC_ReadCardSerial()) {
    String uid = uidToString(&rfidEntry.uid);
    handleEntry(uid);
    
    rfidEntry.PICC_HaltA();
    rfidEntry.PCD_StopCrypto1();
  }
  
  // 2. Check Exit Reader
  if (rfidExit.PICC_IsNewCardPresent() && rfidExit.PICC_ReadCardSerial()) {
    String uid = uidToString(&rfidExit.uid);
    handleExit(uid);
    
    rfidExit.PICC_HaltA();
    rfidExit.PCD_StopCrypto1();
  }
  
  // 3. Telemetry (Every 10 Seconds)
  if (millis() - lastTel > 10000) {
    sendTelemetry();
    lastTel = millis();
  }
}
