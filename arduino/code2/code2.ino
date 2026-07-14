/*
   SMART BUS - FIRMWARE V6 (Dual RFID, No GPS)
   Board: ESP8266 (NodeMCU / WeMos D1 Mini)

   ENTRY RFID
   SDA -> D2
   RST -> D1

   EXIT RFID
   SDA -> D8
   RST -> D0

   SHARED SPI
   SCK  -> D5
   MOSI -> D7
   MISO -> D6
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>

// ================= WIFI =================

const char* WIFI_SSID = "Pavan";
const char* WIFI_PASS = "12345678";

// ================= SUPABASE =================

const char* SUPABASE_URL =
"ogtatxspaxahbeykkovk.supabase.co";

const char* SUPABASE_KEY =
"sb_publishable_pqk_0KjvK4sVPUG-5BS-_w_TZ_Drjzh";

const char* BUS_ID = "BUS101";

// ================= RFID PINS =================

// ENTRY RFID
#define SS_PIN_ENTRY D2
#define RST_PIN_ENTRY D1

// EXIT RFID
#define SS_PIN_EXIT D8
#define RST_PIN_EXIT D0

// ================= RFID OBJECTS =================

MFRC522 rfidEntry(SS_PIN_ENTRY, RST_PIN_ENTRY);
MFRC522 rfidExit(SS_PIN_EXIT, RST_PIN_EXIT);

// ================= DEBOUNCE =================

String lastUidEntry = "";
String lastUidExit  = "";

unsigned long lastTimeEntry = 0;
unsigned long lastTimeExit  = 0;

const unsigned long DEBOUNCE_DELAY = 5000;

// ================= WIFI =================

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.print("Connecting WiFi ");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int count = 0;

  while (WiFi.status() != WL_CONNECTED &&
         count < 30) {

    delay(500);
    Serial.print(".");
    count++;
  }

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println();
    Serial.println("WiFi Connected");

    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println();
    Serial.println("WiFi Failed");
  }
}

// ================= UID =================

String uidToString(MFRC522::Uid *uid) {

  String result = "";

  for (byte i = 0; i < uid->size; i++) {

    if (uid->uidByte[i] < 0x10)
      result += "0";

    result += String(uid->uidByte[i], HEX);
  }

  result.toUpperCase();

  return result;
}

// ================= SUPABASE RPC =================

void callSupabaseRPC(
  String functionName,
  String payload) {

  connectWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  String url =
    "https://" +
    String(SUPABASE_URL) +
    "/rest/v1/rpc/" +
    functionName;

  if (!http.begin(client, url)) {

    Serial.println("HTTP Begin Failed");
    return;
  }

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.addHeader(
    "apikey",
    SUPABASE_KEY
  );

  http.addHeader(
    "Authorization",
    "Bearer " +
    String(SUPABASE_KEY)
  );

  int httpCode =
    http.POST(payload);

  if (httpCode > 0) {

    Serial.print("HTTP ");
    Serial.println(httpCode);

    String response =
      http.getString();

    Serial.println(response);

  } else {

    Serial.print("HTTP Error: ");
    Serial.println(
      http.errorToString(httpCode)
    );
  }

  http.end();
}

// ================= ENTRY =================

void handleEntryTap(String uid) {

  if (uid == lastUidEntry &&
      millis() - lastTimeEntry <
      DEBOUNCE_DELAY) {

    Serial.println(
      "Duplicate ENTRY ignored"
    );

    return;
  }

  lastUidEntry = uid;
  lastTimeEntry = millis();

  Serial.println(
    "ENTRY TAP: " + uid
  );

  String json = "{";
  json += "\"p_card_uid\":\"" + uid + "\",";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_event_type\":\"entry\"";
  json += "}";

  callSupabaseRPC(
    "handle_rfid_tap",
    json
  );
}

// ================= EXIT =================

void handleExitTap(String uid) {

  if (uid == lastUidExit &&
      millis() - lastTimeExit <
      DEBOUNCE_DELAY) {

    Serial.println(
      "Duplicate EXIT ignored"
    );

    return;
  }

  lastUidExit = uid;
  lastTimeExit = millis();

  Serial.println(
    "EXIT TAP: " + uid
  );

  String json = "{";
  json += "\"p_card_uid\":\"" + uid + "\",";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_event_type\":\"exit\"";
  json += "}";

  callSupabaseRPC(
    "handle_rfid_tap",
    json
  );
}

// ================= TELEMETRY =================

void sendTelemetry() {

  String json = "{";
  json += "\"p_bus_id\":\"" + String(BUS_ID) + "\",";
  json += "\"p_lat\":12.9716,";
  json += "\"p_lon\":77.5946,";
  json += "\"p_speed\":0";
  json += "}";

  callSupabaseRPC(
    "handle_telemetry",
    json
  );
}

// ================= RFID CHECK =================

bool checkRFIDConnection(
  MFRC522 &reader,
  const char *name) {

  byte v =
    reader.PCD_ReadRegister(
      MFRC522::VersionReg
    );

  Serial.print(name);
  Serial.print(" RFID Version: 0x");
  Serial.println(v, HEX);

  if (v == 0x00 ||
      v == 0xFF) {

    Serial.println(
      "RFID NOT FOUND"
    );

    return false;
  }

  Serial.println(
    "RFID OK"
  );

  return true;
}

// ================= SETUP =================

void setup() {

  Serial.begin(115200);

  Serial.println();
  Serial.println();
  Serial.println(
    "SMART BUS V6 STARTING"
  );

  SPI.begin();

  rfidEntry.PCD_Init();
  delay(100);

  rfidExit.PCD_Init();
  delay(100);

  checkRFIDConnection(
    rfidEntry,
    "ENTRY"
  );

  checkRFIDConnection(
    rfidExit,
    "EXIT"
  );

  connectWiFi();

  Serial.println(
    "System Ready"
  );
}

// ================= LOOP =================

void loop() {

  // ENTRY RFID

  if (rfidEntry.PICC_IsNewCardPresent() &&
      rfidEntry.PICC_ReadCardSerial()) {

    String uid =
      uidToString(
        &rfidEntry.uid
      );

    handleEntryTap(uid);

    rfidEntry.PICC_HaltA();
    rfidEntry.PCD_StopCrypto1();
  }

  // EXIT RFID

  if (rfidExit.PICC_IsNewCardPresent() &&
      rfidExit.PICC_ReadCardSerial()) {

    String uid =
      uidToString(
        &rfidExit.uid
      );

    handleExitTap(uid);

    rfidExit.PICC_HaltA();
    rfidExit.PCD_StopCrypto1();
  }

  // TELEMETRY

  static unsigned long
    lastTelemetry = 0;

  if (millis() - lastTelemetry >
      10000) {

    sendTelemetry();

    lastTelemetry = millis();
  }
}