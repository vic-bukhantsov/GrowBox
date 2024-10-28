#ifndef RADIO_H
#define RADIO_H
#include <RF24.h>


struct __attribute__((packed)) RemoteLight {
    unsigned long time;
    uint8_t address;
    uint8_t power;
};

class RF24Radio {
    private:
        RF24 radio;
        const byte address[6] = "42341";
        bool isConfigured = false;

    public:
        RF24Radio();
        bool setup();

        bool read(void* buf, u_int8_t size);
        void sendRemoteLight(RemoteLight data);

};

#endif
