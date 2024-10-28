#include <LittleFS.h>
#include "webserver.h"


WebServer::WebServer() {

} 


void WebServer::setup() {
    if (!LittleFS.begin()) {
        Serial.println("Failed to mount LittleFS");
        return;
    }

    server.serveStatic("/s/", LittleFS, "/s/");
    server.on("/", HTTP_GET, [this]() { this->httpRoot(); });
    server.on("/light", HTTP_POST, [this]() { this->httpLight(); });
    server.begin();
}

void WebServer::loop() {
    server.handleClient();
}
