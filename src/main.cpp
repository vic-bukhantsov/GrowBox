#include <Arduino.h>
#include <Print.h>
#include <HardwareSerial.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <LittleFS.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Fonts/FreeSerif24pt7b.h>
#include <Fonts/FreeMono12pt7b.h>
#include <Adafruit_ST7789.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <CRC32.h>
#include "radio.h"
#include "webserver.h"

#define TFT_DC    D1     // TFT DC  pin is connected to NodeMCU pin D1 (GPIO5)
#define TFT_RST   D2     // TFT RST pin is connected to NodeMCU pin D2 (GPIO4)
#define TFT_CS    D0     // TFT CS  pin is connected to NodeMCU pin D8 (GPIO15)


Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);

int loop_counter = 0;
RF24Radio radio = RF24Radio();
WebServer server;

WiFiUDP ntpUDP;
// NTPClient timeClient(ntpUDP, "pool.ntp.org", -18000, 60000); // Update every 60 seconds
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every 60 seconds
// Offset for Eastern Standard Time (UTC-5)
const long UTC_OFFSET_EST = -18000;  // UTC-5 hours in seconds
const long DST_OFFSET = 3600;  // Additional offset of 1 hour for DST
void adjustTimeOffset(unsigned long epochTime);
long timezoneOffset = 0;


unsigned long previousMillis = 0;
const long interval = 1000; // 1 second
bool dotState = false;

#define MODE_MANUAL 1
#define MODE_AUTO 2

struct StoreData {
  uint8_t mode;
  uint8_t power;
  uint16_t start; // minutes after mignght
  uint16_t end;   // minutes after mignght
};

StoreData modeData;
uint8_t currentPower;
uint8_t lastSentPower;

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

void printMode();

// Function to calculate CRC32 for the struct
uint32_t calculateCRC(const StoreData& data) {
  CRC32 crc;
  crc.update((const uint8_t*)&data, sizeof(data)); // Calculate CRC from the bytes of the struct
  return crc.finalize(); // Return the final CRC32 value
}


void saveModeData() {
  int32_t crc = calculateCRC(modeData);
  EEPROM.put(0, modeData);           // Write struct at address 0
  EEPROM.put(sizeof(modeData), crc); // Write CRC checksum after the struct
  EEPROM.commit();      
}

void sendPower(int8_t value) {
  if (value != lastSentPower) {
    RemoteLight data;
    data.power = value;
    data.address = 0x01;
    data.time = timeClient.getEpochTime();

    radio.sendRemoteLight(data);
    currentPower = value;
    lastSentPower = value;
  }
}

void onPowerChangeCallback(int8_t value) {
    if (value == -1) {
      modeData.mode = MODE_AUTO;
    } else {
      modeData.mode = MODE_MANUAL;
      modeData.power = (uint8_t)value; 
      sendPower(modeData.power);
    }
    saveModeData();
    printMode();
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


void printMode() {
  // print light driver current mode


  tft.setFont(&FreeMono12pt7b);
  tft.fillRect(0, 127, 240, 18, ST77XX_BLACK);
  tft.setCursor(0, 142);
  tft.setTextColor(ST77XX_WHITE);

  char line[64];
  if (modeData.mode == MODE_AUTO) {
    snprintf(line, sizeof(line), "Auto %i%%(%i)", currentPower, lastSentPower);
  } else { 
    snprintf(line, sizeof(line), "Manual %i%%(%i)", currentPower, modeData.power);

  }
  tft.print(line);
}

void setup() {
  Serial.begin(115200);
  Serial.println("Setup");

  if (!LittleFS.begin()) {
      Serial.println("Failed to mount file system");
      return;
  }

  EEPROM.begin(512);
  EEPROM.get(0, modeData);
  uint32_t crc = calculateCRC(modeData);
  uint32_t savedCRC;
  EEPROM.get(sizeof(modeData), savedCRC);
  
  if (savedCRC != crc) {
    Serial.print("Wrong stored EEPROM. Initlizing...");
    modeData.mode = MODE_MANUAL;
    modeData.power = 0;
    modeData.start = 6*60+30;
    modeData.end = 21*60+30;
    currentPower = 0;
    saveModeData();
  } else {
    Serial.print("EEPROM is ok.");
  }

  //SPI.begin();
  //SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  SPI.begin();
  SPI.setDataMode(SPI_MODE3);
  //SPI.setFrequency(5000000);

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
  tft.println("Grow Controller");

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
  server.onChangePowerMode(onPowerChangeCallback);
  server.setup();



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
  printMode();
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
  server.loop();
  loop_counter ++;
  // put your main code here, to run repeatedly:
  //Serial.print("Loop: ");
  //Serial.println(loop_counter);
  //delay(1000);
  unsigned long epochTime = timeClient.getEpochTime();
  adjustTimeOffset(epochTime);

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
    tft.setFont(&FreeMono12pt7b);
    tft.fillRect(0, 100, 240, 17, ST77XX_BLACK);
    tft.setCursor(0, 116);
    tft.setTextColor(ST77XX_GREEN);
    char formattedValue[24];
    sprintf(formattedValue, "%s: %i", timeClient.getFormattedTime().c_str(), sensors[0].lastValue);
    tft.println(formattedValue);
  }

    timeClient.update();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    if (modeData.mode == MODE_AUTO) {
      int hours = (epochTime  % 86400) / 3600; // Seconds in a day to get hours
      int minutes = (epochTime % 3600) / 60;   // Seconds in an hour to get minutes
      int minutesSinceMidnight = (hours * 60) + minutes;

      if (350 <= minutesSinceMidnight &&  minutesSinceMidnight < 360) {
        sendPower(5);
      } else if (360 <= minutesSinceMidnight &&  minutesSinceMidnight < 370) {
        sendPower(10);
      } else if (370 <= minutesSinceMidnight &&  minutesSinceMidnight < 390) {
        sendPower(25);
      } else if (390 <= minutesSinceMidnight &&  minutesSinceMidnight < 420) {
        sendPower(50);
      } else if (420 <= minutesSinceMidnight &&  minutesSinceMidnight < 510) {
        sendPower(100);
      } else if (510 <= minutesSinceMidnight &&  minutesSinceMidnight < 660) {
        sendPower(50);
      } else if (510 <= minutesSinceMidnight &&  minutesSinceMidnight < 900) {
        sendPower(25);
      } else if (900 <= minutesSinceMidnight &&  minutesSinceMidnight < 1024) {
        sendPower(100);
      } else if (1024 <= minutesSinceMidnight &&  minutesSinceMidnight < 1140) {
        sendPower(50);
      } else if (1140 <= minutesSinceMidnight &&  minutesSinceMidnight < 1320) {
        sendPower(100);
      } else if (1320 <= minutesSinceMidnight &&  minutesSinceMidnight < 1350) {
        sendPower(50);
      } else if (1350 <= minutesSinceMidnight &&  minutesSinceMidnight < 1360) {
        sendPower(25);
      } else if (1360 <= minutesSinceMidnight &&  minutesSinceMidnight < 1370) {
        sendPower(10);
      } else if (1370 <= minutesSinceMidnight &&  minutesSinceMidnight < 1380) {
        sendPower(5);
      } else {
        sendPower(0);
      }
      printMode();
    }



    String formattedTime = timeClient.getFormattedTime();

      // Print the time with blinking dots
    tft.setFont(&FreeSerif24pt7b);
    tft.fillRect(0, 40, 240, 42, ST77XX_BLACK);
    tft.setCursor(0, 80);
    tft.setTextColor(ST77XX_WHITE);
    tft.println(formattedTime);
  }
}


// Helper functions for extracting month, day, and day of the week
int getMonth(unsigned long epochTime) {
  epochTime = epochTime % 31556926; // Seconds in a year
  int month = (epochTime / 2629743) + 1; // Approximation (seconds per month)
  return month;
}

int getDay(unsigned long epochTime) {
  int days = (epochTime / 86400) % 30; // Approximation (seconds per day)
  return days;
}

int getDayOfWeek(unsigned long epochTime) {
  int dayOfWeek = (epochTime / 86400 + 4) % 7; // +4 because Unix time starts on a Thursday
  return dayOfWeek;
}

// Function to adjust for DST in Toronto timezone
void adjustTimeOffset(unsigned long epochTime) {
  int currentMonth = getMonth(epochTime);
  int currentDay = getDay(epochTime);
  int currentDayOfWeek = getDayOfWeek(epochTime); // 0 = Sunday, 6 = Saturday

  // Check if within DST period (second Sunday in March to first Sunday in November)
  if ((currentMonth > 3 && currentMonth < 11) ||  // DST months (April to October)
      (currentMonth == 3 && currentDay >= 8 && currentDayOfWeek == 0) ||  // Second Sunday in March
      (currentMonth == 11 && currentDay < 8 && currentDayOfWeek == 0)) {  // First Sunday in November
    timeClient.setTimeOffset(UTC_OFFSET_EST + DST_OFFSET);
  } else {
    timeClient.setTimeOffset(UTC_OFFSET_EST);
  }
}

// Function to get minutes since midnight in local time
int getMinutesSinceMidnight(unsigned long epochTime) {
  unsigned long localTime = epochTime;  // Adjust to local time
  int hours = (localTime  % 86400) / 3600; // Seconds in a day to get hours
  int minutes = (localTime % 3600) / 60;   // Seconds in an hour to get minutes
  return (hours * 60) + minutes;
}