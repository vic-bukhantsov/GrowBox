#ifndef WEBSERVER_H
#define WEBSERVER_H
#include <ESP8266WebServer.h>


typedef void (*ChangePowerCallback)(int8_t);


class WebServer {
    private:
        ESP8266WebServer server = ESP8266WebServer(80);
        ChangePowerCallback powerCallback = nullptr;

        void httpRoot();
        void httpLight();
    
    public:
        WebServer();
        void setup();
        void loop();
        void onChangePowerMode(ChangePowerCallback callback) {
            this->powerCallback = callback;
        }
};



#endif