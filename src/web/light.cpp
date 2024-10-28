
#include <LittleFS.h>
#include "webserver.h"


void WebServer::httpLight() {
    if (server.hasArg("power")) {
        String inputValue = server.arg("power");
        Serial.print("HTTP Received value: ");
        Serial.println(inputValue);

        if (this->powerCallback) {
            if (inputValue == "auto") {
                this->powerCallback(-1);
            } else {
                this->powerCallback((int8_t)inputValue.toInt());
            }
        }

        server.sendHeader("Location", "/", true);
        server.send(302, "text/plain", ""); // Empty body for the redirect
    } else {
        server.send(400, "text/plain", "Bad Request: No input provided");
    }
}
