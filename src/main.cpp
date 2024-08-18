#include <Arduino.h>
#include <Print.h>
#include <HardwareSerial.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <LittleFS.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include "radio.h"

#define TFT_DC    D1     // TFT DC  pin is connected to NodeMCU pin D1 (GPIO5)
#define TFT_RST   D2     // TFT RST pin is connected to NodeMCU pin D2 (GPIO4)
#define TFT_CS    D0     // TFT CS  pin is connected to NodeMCU pin D8 (GPIO15)


Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);

int loop_counter = 0;
RF24Radio radio = RF24Radio();
ESP8266WebServer server(80);

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -18000, 60000); // Update every 60 seconds
unsigned long previousMillis = 0;
const long interval = 1000; // 1 second
bool dotState = false;


const char* ssid = WIFI_SSID;       // Replace with your network SSID
const char* password = WIFI_PASSWORD; // Replace with your network password
const char* hostname = "e-pot";     // Desired hostname

struct SensorData {
  int lastValue;
  int minValue;
  int maxValue;
  bool is_crirical;
  bool is_flash_on;
};

#define MOD_OPERATION 0
#define MOD_CALIBRATION 1

struct RemoteData {
  byte lastValue;
  byte prevValue;
  byte mode;
  byte buff;
  unsigned long counter;
};

SensorData sensors[5];
RemoteData remote;


void handleRoot() {
  if (!LittleFS.begin()) {
    Serial.println("Failed to mount file system");
    return;
  }

  File file = LittleFS.open("/index.html", "r");
  if (!file) {
    Serial.println("Failed to open file");
    return;
  }

  String fileContent;
  while (file.available()) {
    fileContent += char(file.read());
  }
  file.close();

  server.send(200, "text/html", fileContent);
}

void printUint32ByBytes(unsigned long value) {
    // Print each byte of a uint32_t starting from the least significant byte
    Serial.print("Bytes of uint32_t: ");
    for (int i = 0; i < 4; i++) {
        // Shift the desired byte to the lowest position and mask it
        uint8_t byte = (value >> (i * 8)) & 0xFF;
        Serial.print("0x");
        if (byte < 16) {
            Serial.print("0");  // Leading zero for single hex digit numbers
        }
        Serial.print(byte, HEX);
        if (i < 3) {
            Serial.print(", ");
        }
    }
    Serial.println();  // End the line after printing all bytes
}

void setup() {
  Serial.begin(115200);
  Serial.println("Setup");


  //SPI.begin();
  //SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  SPI.begin();
  SPI.setDataMode(SPI_MODE3);
  SPI.setFrequency(5000000);

  // Reset the display
  pinMode(TFT_RST, OUTPUT);
  digitalWrite(TFT_RST, LOW);
  delay(20);
  digitalWrite(TFT_RST, HIGH);
  delay(150);

  tft.init(240, 240, SPI_MODE3); // Init ST7789 240x240
  //tft.init(240, 240, SPI_MODE0); // Init ST7789 240x240
  tft.setRotation(2); // Set display rotation
  tft.fillScreen(ST77XX_BLACK); // Clear the screen

  // Test display
  tft.setCursor(0, 0);
  tft.setTextColor(ST77XX_RED);
  tft.setTextSize(2);
  tft.println("Hello, ST7789!");

  WiFi.begin(ssid, password);

  Serial.print("Connecting to ");
  Serial.println(ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  tft.setCursor(0, 18);
  tft.setTextColor(ST77XX_GREEN);
  tft.println(WiFi.localIP());

  // Start mDNS
  if (MDNS.begin(hostname)) {
    Serial.println("mDNS responder started");
  } else {
    Serial.println("Error setting up mDNS responder!");
  }

  // Add service to mDNS-SD
  MDNS.addService("http", "tcp", 80);
  timeClient.begin();

  if (!LittleFS.begin()) {
    Serial.println("Failed to mount file system");
    return;
  }
  server.on("/", HTTP_GET, handleRoot);
  server.begin();


  sensors[0].minValue = 2000;
  sensors[0].maxValue = 0;
  sensors[0].is_crirical = false;
  sensors[0].is_flash_on = false;

  if (radio.setup()) {
    tft.setTextSize(1);
    tft.setCursor(0, 150);
    tft.setTextColor(ST77XX_MAGENTA);
    tft.println("Radio is connected");
  } else {
    tft.setTextSize(1);
    tft.setCursor(0, 150);
    tft.setTextColor(ST77XX_RED);
    tft.println("Radio is not connected!");
  }

  Serial.println("Setup is done");

}

void processSensorValue(SensorData &sensor, int newValue) {
  // Update the last value
  sensor.lastValue = newValue;
  
  // Update the min value if the new value is lower
  if (newValue < sensor.minValue) {
    sensor.minValue = newValue;
  }
  
  // Update the max value if the new value is higher
  if (newValue > sensor.maxValue) {
    sensor.maxValue = newValue;
  }

  Serial.println(F("+++++"));
  Serial.print(F("New value " ));
  Serial.println(newValue);
  Serial.print(F("Min value "));
  Serial.println(sensor.minValue);
  Serial.print(F("Max value "));
  Serial.println(sensor.maxValue);

  float edge = sensor.maxValue * 0.80;
  Serial.print(F("Edge "));
  Serial.println(edge);

  if (newValue >= edge) {
    if (!sensor.is_crirical) {
      Serial.println(F("TurnOn critical"));
      sensor.is_crirical = true;
      sensor.is_flash_on = true;
    }
  } else {
    Serial.println(F("TurnOff critical"));
    sensor.is_crirical = false;
  }
}

void loop() {
  MDNS.update();
  server.handleClient();
  loop_counter ++;
  // put your main code here, to run repeatedly:
  //Serial.print("Loop: ");
  //Serial.println(loop_counter);
  //delay(1000);

  bool readStatus = radio.read(&remote, sizeof(remote));

  if(readStatus){
    Serial.println("----------");
    Serial.println("RX");
    Serial.print("prevValue: ");
    Serial.println(remote.prevValue);
    Serial.print("lastValue: ");
    Serial.println(remote.lastValue);
    Serial.print("mode: ");
    Serial.println(remote.mode);
    printUint32ByBytes(remote.counter);
    processSensorValue(sensors[0], remote.lastValue);   
    tft.setTextSize(2);
    tft.fillRect(0, 100, 240, 24, ST77XX_BLACK);
    tft.setCursor(0, 100);
    tft.setTextColor(ST77XX_GREEN);
    char formattedValue[24];
    sprintf(formattedValue, "%s: %i", timeClient.getFormattedTime().c_str(), sensors[0].lastValue);
    tft.println(formattedValue);
  }

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    timeClient.update();
    String formattedTime = timeClient.getFormattedTime();

      // Print the time with blinking dots
    tft.setTextSize(3);
    tft.fillRect(0, 40, 240, 24, ST77XX_BLACK);
    tft.setCursor(0, 40);
    tft.setTextColor(ST77XX_WHITE);
    tft.println(formattedTime);
  }
}


