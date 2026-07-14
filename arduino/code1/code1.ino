/*
   SMART BUS - FIRMWARE V4 (Single RFID & Debounce Fix)
   Board: ESP8266 (NodeMCU / WeMos D1 Mini)
   
   ================ WIRING GUIDE ================
   
   1. RFID READER (SINGLE) - RC522
      - SDA (SS)  -> D2 (GPIO 4)
      - RST       -> D1 (GPIO 5)
      - SCK       -> D5 (GPIO 14)
      - MOSI      -> D7 (GPIO 13)
      - MISO      -> D6 (GPIO 12)
      - GND       -> GND
      - 3.3V      -> 3.3V

   2. GPS MODULE (NEO-6M)
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
const char* WIFI_SSID = "Pavan";
const char* WIFI_PASS = "12345678";

const char* SUPABASE_URL = "ogtatxspaxahbeykkovk.supabase.co"; 
const char* SUPABASE_KEY = "sb_publishable_pqk_0KjvK4sVPUG-5BS-_w_TZ_Drjzh"; 

const char* BUS_ID = "BUS101"; // Unique ID for this bus

// ================= PINS =================
// GPS Pins (Software Serial)
#define GPS_RX D4
#define GPS_TX D3

// RFID Pins (Single Reader)
#define SS_PIN D2
#define RST_PIN D1

// ================= OBJECTS =================
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
TinyGPSPlus gpsParser;
MFRC522 rfid(SS_PIN, RST_PIN);

bool gpsFix = false;

// ================= DEBOUNCE VARS =================
String lastUid = "";
unsigned long lastTime = 0;

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

  // Reduce SSL buffer sizes to fit inside the ESP8266's limited RAM
  client.setBufferSizes(2048, 1024);
  client.setTimeout(4000); 

  HTTPClient http;
  http.setTimeout(4000);
  
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

void handleTap(String uid) {
  // Check Debounce
  if (uid == lastUid && (millis() - lastTime < DEBOUNCE_DELAY)) {
    Serial.println("Ignored Duplicate Tap (5s timeout): " + uid);
    return;
  }
  
  Serial.println("PROCESSING RFID TAP: " + uid);
  lastUid = uid;
  lastTime = millis();
  
  String json = "{";
  json += "\"p_card_uid\":\"" + uid + "\",";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_lat\":" + String(getLat(), 6) + ",";
  json += "\"p_lon\":" + String(getLon(), 6);
  json += "}";
  
  callSupabaseRPC("handle_rfid_tap", json);
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

// Helper to verify MFRC522 communication over SPI
bool checkRFIDConnection(MFRC522 &reader, const char *name) {
  byte v = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("RFID ");
  Serial.print(name);
  Serial.print(" (Version Reg: 0x");
  Serial.print(v, HEX);
  Serial.print(")");

  if (v == 0x00 || v == 0xFF) {
    Serial.println(" -> CONNECTION FAILED! Check wiring / power.");
    return false;
  } else {
    Serial.println(" -> CONNECTED & OK.");
    return true;
  }
}

// ================= MAIN =================

void setup() {
  Serial.begin(115200);
  
  // Configure Slave Select (CS) pin as OUTPUT and deselect it (HIGH)
  pinMode(SS_PIN, OUTPUT);
  digitalWrite(SS_PIN, HIGH);

  // Configure Reset pin as OUTPUT and release reset (HIGH)
  pinMode(RST_PIN, OUTPUT);
  digitalWrite(RST_PIN, HIGH);

  // Init Hardware
  SPI.begin();
  
  Serial.println("\nInitializing RFID Reader...");
  rfid.PCD_Init();
  checkRFIDConnection(rfid, "SingleReader");
  
  gpsSerial.begin(9600);
  
  Serial.println("\n\n--- SMART BUS SYSTEM STARTING (V4 - Single RFID) ---");
  
  connectWiFi();
  
  Serial.println("System Ready. Waiting for Cards...");
}

void loop() {
  readGPS();
  
  // 1. Check RFID Reader
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = uidToString(&rfid.uid);
    handleTap(uid);
    
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
  
  // 2. Telemetry (Every 10 Seconds)
  static unsigned long lastTel = 0;
  if (millis() - lastTel > 10000) {
    sendTelemetry();
    lastTel = millis();
  }
}
