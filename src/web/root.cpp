
#include <LittleFS.h>
#include "webserver.h"


void WebServer::httpRoot() {
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
