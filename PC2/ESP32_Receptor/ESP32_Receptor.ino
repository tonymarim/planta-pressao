// ESP32-C3 / Arduino-ESP32 3.3.11 / USB CDC On Boot habilitado.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

constexpr uint8_t CHANNEL = 6;
struct Packet { uint8_t mac[6]; int8_t rssi; uint16_t length; uint32_t at; char data[251]; };
QueueHandle_t packets;
bool ready = false;
uint32_t lastHeartbeat = 0;
volatile uint32_t queueDrops = 0;

void received(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (!info || !data || len < 1 || len > 250 || !packets) return;
  Packet p;
  memcpy(p.mac, info->src_addr, 6);
  p.rssi = info->rx_ctrl ? info->rx_ctrl->rssi : 0;
  p.length = len; p.at = millis();
  memcpy(p.data, data, len); p.data[len] = 0;
  if (xQueueSend(packets, &p, 0) != pdTRUE) queueDrops++;
}
void quoted(const char *data, size_t len) {
  Serial.print('"');
  for (size_t i=0; i<len; i++) {
    uint8_t c = (uint8_t)data[i];
    if (c == '"' || c == '\\') { Serial.print('\\'); Serial.write(c); }
    else if (c < 32 || c > 126) Serial.printf("\\u%04x", c);
    else Serial.write(c);
  }
  Serial.print('"');
}
void setup() {
  Serial.begin(115200);
  // Não esperar indefinidamente por USB: o receptor deve inicializar o rádio.
  packets = xQueueCreate(12, sizeof(Packet));
  if (!packets) return;
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  if (esp_wifi_set_channel(CHANNEL, WIFI_SECOND_CHAN_NONE) != ESP_OK) return;
  if (esp_now_init() != ESP_OK) return;
  if (esp_now_register_recv_cb(received) != ESP_OK) return;
  ready = true;
}
void loop() {
  Packet p;
  if (packets && xQueueReceive(packets, &p, 0) == pdTRUE) {
    uint32_t age = millis() - p.at;
    // Não apresentar backlog USB como telemetria nova.
    if (age <= 1500 && Serial) {
      Serial.printf("{\"type\":\"rx\",\"mac\":\"%02X:%02X:%02X:%02X:%02X:%02X\",\"rssi\":%d,\"age_ms\":%lu,\"data\":",
        p.mac[0],p.mac[1],p.mac[2],p.mac[3],p.mac[4],p.mac[5],p.rssi,(unsigned long)age);
      quoted(p.data,p.length); Serial.println('}');
    }
  }
  if (millis() - lastHeartbeat >= 1000 && Serial) {
    lastHeartbeat = millis();
    if (ready) Serial.printf("{\"type\":\"ready\",\"protocol\":\"AULA12-PC2-V1\",\"mac\":\"%s\",\"channel\":6,\"queue_drops\":%lu}\n",WiFi.macAddress().c_str(),(unsigned long)queueDrops);
    else Serial.println("{\"type\":\"error\",\"error\":\"INICIALIZACAO_RADIO\"}");
  }
  delay(1);
}
