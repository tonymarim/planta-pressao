// Arduino-ESP32 3.3.11. PC1 gera e trata; esta placa faz a ponte USB -> ESP-NOW.
#include <Arduino.h>
#include <WiFi.h>
#include <ESP32_NOW.h>
#include <esp_wifi.h>
#include <esp_system.h>
#include <math.h>
#include <errno.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

constexpr uint8_t CHANNEL = 6;
const uint8_t DESTINATION[] = {0xff,0xff,0xff,0xff,0xff,0xff};
QueueHandle_t results;
bool radioReady = false, busy = false;
uint32_t bootId, sampleSeq, sampleTeam, sampleTime, lastHeartbeat;
uint32_t previousSeq = 0;
float samplePressure;
char sampleMode[6], line[96];
size_t used = 0;
bool overflow = false;

class Transmitter : public ESP_NOW_Peer {
public:
  using ESP_NOW_Peer::add;
  using ESP_NOW_Peer::send;
  Transmitter() : ESP_NOW_Peer(DESTINATION, CHANNEL, WIFI_IF_STA, nullptr) {}
  void onSent(bool success) override {
    // Callback de rádio: apenas enfileirar; a serial é tratada no loop.
    uint8_t value = success ? 1 : 0;
    xQueueSend(results, &value, 0);
  }
} transmitter;

void error(const char *reason) { Serial.printf("{\"type\":\"error\",\"error\":\"%s\"}\n", reason); }
void heartbeat() {
  if (!radioReady) { error("RADIO_INDISPONIVEL"); return; }
  Serial.printf("{\"type\":\"ready\",\"protocol\":\"AULA12-PC1-V1\",\"mac\":\"%s\",\"channel\":%u,\"boot\":%lu,\"busy\":%s}\n",
    WiFi.macAddress().c_str(), CHANNEL, (unsigned long)bootId, busy ? "true" : "false");
}
void report(bool ok, const char *reason) {
  Serial.printf("{\"type\":\"tx\",\"ok\":%s,\"error\":\"%s\",\"equipe\":%lu,\"seq\":%lu,\"boot\":%lu,\"p_bar\":%.2f,\"modo\":\"%s\",\"receiver_verified\":false}\n",
    ok ? "true" : "false", reason, (unsigned long)sampleTeam, (unsigned long)sampleSeq,
    (unsigned long)bootId, samplePressure, sampleMode);
}
bool unsignedNumber(const char *s, uint32_t &value) {
  if (!s || !*s) return false;
  for (const char *p=s; *p; ++p) if (*p < '0' || *p > '9') return false;
  errno = 0; char *end; unsigned long n = strtoul(s, &end, 10);
  if (errno || *end) return false;
  value = (uint32_t)n; return true;
}
void command(char *text) {
  if (!radioReady) { error("RADIO_INDISPONIVEL"); return; }
  if (busy) { error("RADIO_OCUPADO"); return; }
  // Exigir exatamente 5 campos, inclusive sem campos vazios.
  char *fields[5]; fields[0] = text;
  unsigned count = 1;
  for (char *p=text; *p; ++p) if (*p == ',') {
    if (count >= 5) { error("FORMATO"); return; }
    *p = 0; fields[count++] = p+1;
  }
  if (count != 5) { error("FORMATO"); return; }
  for (unsigned i=0; i<5; i++) if (!*fields[i]) { error("CAMPO_VAZIO"); return; }
  uint32_t team, seq;
  if (strcmp(fields[0], "P") || !unsignedNumber(fields[1], team) || team < 1 || team > 999 ||
      !unsignedNumber(fields[2], seq) || seq < 1 || seq > 4294967294UL) { error("IDENTIFICACAO"); return; }
  char *end; errno = 0; float pressure = strtof(fields[3], &end);
  if (errno || *end || !isfinite(pressure) || pressure < 0 || pressure > 10) { error("PRESSAO"); return; }
  if (strcmp(fields[4], "AUTO") && strcmp(fields[4], "TESTE")) { error("MODO"); return; }
  // Se o Node-RED reiniciar sua sequência, abrir nova sessão de telemetria.
  if (seq <= previousSeq) bootId = esp_random();
  previousSeq = seq;
  sampleTeam = team; sampleSeq = seq; samplePressure = pressure;
  strlcpy(sampleMode, fields[4], sizeof(sampleMode)); sampleTime = millis();
  char packet[230];
  int len = snprintf(packet, sizeof(packet), "{\"v\":1,\"equipe\":%lu,\"tanque\":\"TK-101\",\"boot\":%lu,\"seq\":%lu,\"t_ms\":%lu,\"p_bar\":%.2f,\"modo\":\"%s\"}",
    (unsigned long)team, (unsigned long)bootId, (unsigned long)seq, (unsigned long)sampleTime, pressure, sampleMode);
  if (len < 0 || len >= (int)sizeof(packet)) { error("PACOTE_LONGO"); return; }
  busy = true;
  if (transmitter.send((const uint8_t *)packet, len) != (size_t)len) {
    busy = false; report(false, "FALHA_AO_ENFILEIRAR");
  }
}
void setup() {
  Serial.begin(115200);
  bootId = esp_random();
  results = xQueueCreate(4, sizeof(uint8_t));
  if (!results) { error("MEMORIA"); return; }
  WiFi.mode(WIFI_STA);
  if (esp_wifi_set_channel(CHANNEL, WIFI_SECOND_CHAN_NONE) != ESP_OK) { error("CANAL"); return; }
  if (!ESP_NOW.begin() || !transmitter.add()) { error("INICIALIZACAO_ESP_NOW"); return; }
  radioReady = true; heartbeat();
}
void loop() {
  uint8_t result;
  if (results && xQueueReceive(results, &result, 0) == pdTRUE && busy) {
    busy = false; report(result == 1, result ? "" : "FALHA_MAC");
  }
  // Sem callback, permanecer ocupado: não atribuir callback tardio a outra amostra.
  if (busy && millis() - sampleTime > 3000) {
    radioReady = false; busy = false; report(false, "TIMEOUT_RADIO_REINICIE_ESP32");
  }
  unsigned budget = 128;
  while (budget-- && Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      if (overflow) error("LINHA_LONGA");
      else if (used) { line[used] = 0; command(line); }
      used = 0; overflow = false;
    } else if (used < sizeof(line)-1 && !overflow) line[used++] = c;
    else overflow = true;
  }
  if (millis() - lastHeartbeat >= 1000) { lastHeartbeat = millis(); heartbeat(); }
  delay(1);
}
