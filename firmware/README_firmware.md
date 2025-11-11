# ESP32 Firmware — esp32_env_monitor

## Files
- esp32_env_monitor.ino
- dht11_module.h
- mq7_module.h

## Purpose
Reads:
- DHT11 sensor (temperature, humidity)
- MQ-7 sensor (analog gas)
- WiFi RSSI via `WiFi.RSSI()`

Posts JSON to backend `/api/data` every 2 seconds:
```json
{
  "device_id":"esp32_01",
  "temperature": 24.6,
  "humidity": 46.1,
  "gas": 320.5,
  "wifi_rssi": -61.4
}
