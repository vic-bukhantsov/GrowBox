#include <Arduino.h>
#include "radio.h"


RF24Radio::RF24Radio() {
    this->radio = RF24(D4, D3);
}

const byte target[6] = "52351";

bool RF24Radio::setup() {
    radio.begin();
    if (!radio.isChipConnected()) {
        return false;
    }
    radio.setChannel(23);
    radio.openReadingPipe(1, address);
    radio.openWritingPipe(target);
    radio.setPALevel(RF24_PA_MAX);
    radio.enableDynamicPayloads();
    radio.enableAckPayload();
    radio.setDataRate(RF24_250KBPS);
    radio.setCRCLength(RF24_CRC_8);
    radio.startListening();
    isConfigured = true;
    return true;
}


 bool RF24Radio::read(void* buf, u_int8_t size) {
    if (!isConfigured) { 
        return false;
    }
    if(radio.available()) {
        radio.read(buf, size);
        return true;
    }
    return false;
 }


void RF24Radio::sendRemoteLight(RemoteLight data) {
    Serial.print("Send data ");
    Serial.print(data.time);
    Serial.print("Power ");
    Serial.println(data.power);
    radio.stopListening();
    delay(10);
    radio.writeBlocking(&data, sizeof(data), 1000);
    delay(10);
    radio.startListening();
}