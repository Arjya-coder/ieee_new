/* esp32_env_monitor.ino
   ESP32 -> DHT11 + MQ-7 + WiFi.RSSI -> POST JSON to backend every 2s
   Place in folder esp32_env_monitor and open esp32_env_monitor.ino in Arduino IDE.

   Required libraries:
     - DHT sensor library (by Adafruit)
     - Adafruit Unified Sensor (dependency)
   Built-in libs: WiFi.h, HTTPClient.h

   Notes:
     - Does NOT send rfm_rssi or rf_noise_floor. Backend will insert antenna readings.
     - Configure WIFI_SSID, WIFI_PASS, and BACKEND_URL below before uploading.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"
#include "dht11_module.h"
#include "mq7_module.h"

// ---------------- USER CONFIG ----------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* BACKEND_URL = "http://192.168.1.100:5000/api/data"; // change to your backend
const char* DEVICE_ID = "esp32_01";

// Pins
#define DHTPIN 4            // DHT11 data pin (GPIO4)
#define DHTTYPE DHT11
#define MQ7_PIN 34          // MQ-7 analog pin (GPIO34)
#define STATUS_LED_PIN 2    // onboard LED

// Timing
const unsigned long POST_INTERVAL_MS = 2000UL; // 2s
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000UL; // 5s

// ------------------------------------------------

DHT dht(DHTPIN, DHTTYPE);
unsigned long lastPost = 0;
unsigned long lastWifiTry = 0;

void setup() {
  Serial.begin(115200);
  delay(100);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  dht.begin();
  analogReadResolution(12); // 0-4095
  analogSetPinAttenuation(MQ7_PIN, ADC_11db);

  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiTry > WIFI_RECONNECT_INTERVAL_MS) {
      lastWifiTry = now;
      connectWiFi();
    }
    delay(200);
    return;
  }

  if (now - lastPost >= POST_INTERVAL_MS) {
    lastPost = now;
    digitalWrite(STATUS_LED_PIN, HIGH);

    // Read DHT11
    float temperature = NAN;
    float humidity = NAN;
    int attempts = 0;
    while (attempts < 3) {
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
      if (!isnan(temperature) && !isnan(humidity)) break;
      attempts++;
      delay(200);
    }
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[WARN] DHT read failed; sending 0s fallback.");
      temperature = 0.0;
      humidity = 0.0;
    }

    // Read MQ-7 analog value and convert to gas units (simple linear map)
    int adc = analogRead(MQ7_PIN);
    float gas_unit = mq7_map_adc_to_gas(adc);

    // WiFi RSSI
    int wifi_rssi = WiFi.RSSI();

    // Build JSON payload
    // {"device_id":"esp32_01","temperature":24.6,"humidity":46.1,"gas":320.5,"wifi_rssi":-61.4}
    char payload[256];
    snprintf(payload, sizeof(payload),
             "{\"device_id\":\"%s\",\"temperature\":%.2f,\"humidity\":%.2f,\"gas\":%.2f,\"wifi_rssi\":%.2f}",
             DEVICE_ID, temperature, humidity, gas_unit, (float)wifi_rssi);

    Serial.print("[POST] ");
    Serial.println(payload);

    bool ok = http_post_json(String(BACKEND_URL), String(payload));
    if (!ok) {
      Serial.println("[ERROR] POST failed.");
    }

    digitalWrite(STATUS_LED_PIN, LOW);
  }

  delay(10);
}

void connectWiFi() {
  Serial.printf("[*] Connecting to WiFi SSID='%s' ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000UL) {
    delay(250);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[*] WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WARN] WiFi connect timeout. Will retry.");
  }
}

bool http_post_json(const String &url, const String &json_payload) {
  HTTPClient http;
  bool success = false;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = -1;
  httpCode = http.POST((uint8_t *)json_payload.c_str(), json_payload.length());
  if (httpCode > 0) {
    String resp = http.getString();
    Serial.printf("[HTTP %d] %s\n", httpCode, resp.c_str());
    success = (httpCode >= 200 && httpCode < 300);
  } else {
    Serial.printf("[HTTP] failed, error: %s\n", http.errorToString(httpCode).c_str());
    success = false;
  }
  http.end();
  return success;
}
