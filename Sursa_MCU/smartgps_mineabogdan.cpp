#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <SPI.h>
#include <Wire.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include "TM1637.h"

#define OLED_RESET LED_BUILTIN // reset OLED
#define CLK D3 // definirea pinilor pentru afisaj digit      
#define DIO D4

static const int RXPin = 12, TXPin = 13;
static const uint32_t GPSBaud = 9600;

#define SSID "Lol" // date wifi
#define PASS "1234567800"

float latit = 0, longit = 0;
const size_t bufferSize = JSON_ARRAY_SIZE(11) + JSON_OBJECT_SIZE(3) + 11*JSON_OBJECT_SIZE(5) + 3520; // parametrii forma implicita JSON
DynamicJsonBuffer jsonBuffer(bufferSize);
String api = "http://192.168.43.195:8080", x; // adresa de apel
int uid = 1001, leng, payload;

TinyGPSPlus gps;
WiFiClient  client;

TM1637 tm1637(CLK,DIO); // DIGIT LED
Adafruit_SSD1306 display(OLED_RESET); // OLED
HTTPClient http; // API CLIENT

void setup(){
  ss.begin(GPSBaud);
  Serial.begin(9600); // to usb
  WiFi.begin(SSID, PASS); // conectare wifi
  IPAddress ip(192,168,43,223);   // ip static
  IPAddress gateway(192,168,43,1);   
  IPAddress subnet(255,255,255,0);
  Serial.println("SCANAUTH");   
  WiFi.config(ip, gateway, subnet);
   while (WiFi.status() != WL_CONNECTED) {
     delay(500);
     Serial.print(".");
   }
  Serial.println("CONNECTED");

  tm1637.init();
  tm1637.set(5); //BRIGHT_TYPICAL = 2,BRIGHT_DARKEST = 0,BRIGHTEST = 7;
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  getInit();
  pinMode(D5, INPUT); // buton locatie curenta, butonul de reset este conectat la contactul placii
  pinMode(D7, OUTPUT);pinMode(D8, OUTPUT); // LED-uri
  digitalWrite(D7,LOW);digitalWrite(D8, LOW);
}

void loop(){
  //if(digitalRead(D5)) currentLoc(); // activare functie buton locatie curenta
  if(digitalRead(D5)){ currentLoc(); delay(1000); }
  while (ss.available() > 0)
    if (gps.encode(ss.read())){
      latit = (gps.location.lat());
      longit = (gps.location.long());
    }
  delay(200);
}

void getInit(){
  if (WiFi.status() == WL_CONNECTED) {
    http.begin(api+"/init/"+uid); // descarca JSON
    int httpCode = http.GET();
    if (httpCode == 200) {
      displayinit(http.getString());
    } else {
      Serial.println(http.errorToString(httpCode));
    }
    http.end();
  }
}

int getRandomNumber(int startNum, int endNum) { // generator randomness
  randomSeed(ESP.getCycleCount()); 
  return random(startNum, endNum);
}

void displayinit(String ret){
      x = ret;
      JsonObject& root = jsonBuffer.parseObject(x); // obiect global json declarat prin referinta
      leng = root["length"];
      int randNum = getRandomNumber(1,leng);
      Serial.println(randNum);
      JsonArray& list = root["list"];
      JsonObject& list0 = list[randNum];
      const char* list0_name = list0["name"];
      const char* list0_desc = list0["desc"];
      display.setCursor(0,0);
      display.setTextSize(1);
      display.setTextColor(WHITE);
      display.println(list0_name);
      display.println(list0_desc);
      display.display();
      payload = root["points"];
      tm1637.display(2,payload/10);
      tm1637.display(3,payload%10);
}

void displayUpd(int a, int b){
      JsonObject& root = jsonBuffer.parseObject(x);
      leng = root["length"];
      JsonArray& list = root["list"];
      JsonObject& list0 = list[a-1];
      const char* list0_name = list0["name"];
      const char* list0_desc = list0["desc"];
      display.clearDisplay();
      display.setCursor(0,0);
      display.setTextSize(1);
      display.setTextColor(WHITE);
      display.println(list0_name);
      display.println(list0_desc);
      display.display();
      if(payload!=b) { payload = b; digitalWrite(D7,HIGH); tone(D6,1000,450); delay(500); digitalWrite(D7,LOW); } else { digitalWrite(D8,HIGH); delay(850); digitalWrite(D8,LOW); }
      tm1637.display(2,b/10);
      tm1637.display(3,b%10);
}

void currentLoc(){
  if (WiFi.status() == WL_CONNECTED) {
    http.begin(api+"/closest/"+latit+"/"+longit+"/"+uid);
    int httpCode = http.GET();
    if (httpCode == 200) {
      String input = http.getString();
      String value1, value2;
      for (int i = 0; i < input.length(); i++) {
        if (input.substring(i, i+1) == ",") {
          value1 = input.substring(0, i);
          value2= input.substring(i+1);
          break;
        }
      }
      displayUpd(atoi(value1.c_str()),atoi(value2.c_str()));
    } else {
      Serial.println(http.errorToString(httpCode));
    }
    http.end();
  }
}