/*
 * Copyright 2020 Ilker Temir <ilker@ilkertemir.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* 
Updated the plugin to handle data provided by Ecowitt Wttboy sensor. 
Additionally removed true wind conversion as neither sensor has speed and direction data to calculate true wind.
Apparent wind is provided to signalk to be used by derived-data plugin.
*/

module.exports = function (app) {
  var plugin = {};
  var server;

  plugin.id = 'signalk-ecowitt';
  plugin.name = 'SignalK Ecowitt GW1000 and GW2000';
  plugin.description = 'This plugin allows you to receve data from Ecowitt GW1000 and GW2000 wireless gateways';

  function inhg2pascal(inhg) {
    return (Math.round(inhg*3386));
  }

  function fahrenheit2kelvin(f) {
    return (Math.round((f - 32) * 5/9 + 273.15));
  }

  function degrees2radians(d) {
    return (Math.round(d*0.01745*100)/100);
  }

  function mph2mps(s) {
    return (Math.round(s*0.44704*100)/100);
  }

   function inch2mm(i) {
    return (Math.round(i*2.54));
  }


  plugin.start = function (options, restartPlugin) {
    var http = require('http');
    var qs = require('querystring');

    server = http.createServer(function (req, res) {
      if (req.method === "POST") {
        var body = "";
        req.on("data", function (chunk) {
          body += chunk;
        });

        req.on("end", function(){
          var q = qs.parse(body);
          res.end();
          var tempin = fahrenheit2kelvin (parseFloat (q.tempinf));
          var humidityin = parseFloat(q.humidityin)/100;
          var baromrelin = inhg2pascal(parseFloat(q.baromrelin));
          var baromabsin = inhg2pascal(parseFloat(q.baromabsin));
          var tempout = fahrenheit2kelvin(parseFloat (q.tempf));
          var humidityout = parseFloat(q.humidity)/100;
          var solarradiationout = parseFloat(q.solarradiation);
          var uvout = parseFloat(q.uv);
          var rrain_piezoout = inch2mm(parseFloat(q.rrain_piezo));
          var drain_piezoout = inch2mm(parseFloat(q.drain_piezo));


          var values = [
            {
              path: 'environment.ecowitt.inside.temperature',
              value: tempin
            },
            {
              path: 'environment.ecowitt.inside.humidity',
              value: humidityin
            },
            {
              path: 'environment.ecowitt.outside.pressure',
              value: baromrelin
            },
            {
              path: 'environment.ecowitt.inside.relpressure',
              value: baromrelin
            },
            {
              path: 'environment.ecowitt.inside.abspressure',
              value: baromabsin
            },
            {
              path: 'environment.ecowitt.outside.temperature',
              value: tempout
            },
            {
              path: 'environment.ecowitt.outside.humidity',
              value: humidityout
            },
            {
              path: 'environment.ecowitt.outside.solarradiation',
              value: solarradiationout
            },
            {
              path: 'environment.ecowitt.outside.uv',
              value: uvout
             },
            {
              path: 'environment.ecowitt.outside.rrain_piezo',
              value: rrain_piezoout
            },
            {
              path: 'environment.ecowitt.outside.drain_piezo',
              value: drain_piezoout
            }
          ];


          for (let i=1;i<=3;i++) {
            let tempKey = 'temp' + i.toString() + 'f';
                app.debug("tempKey " + tempKey);
            let humidityKey = 'humidity' + i.toString();
                app.debug("humidityKey " + humidityKey);
            if (tempKey in q) {
              var temp = fahrenheit2kelvin(parseFloat(q[tempKey]));
              app.debug("temp " + temp);
              eval ('var key=options.temp' + i.toString());
              if (key) {
                values.push ({
                  path: key,
                  value: temp
                });
              }
            }
            if (humidityKey in q) {
              var humidity = parseFloat (q[humidityKey])/100;
              eval ('var key=options.humidity' + i.toString());
              if (key) {
                values.push ({
                  path: key,
                  value: humidity
                });
              }
            }
          }

          if ('windspeedmph' in q) {
            var windSpeed = mph2mps (parseFloat (q.windspeedmph));
              var path = 'environment.wind.speedApparent';
            values.push ({
              path: path,
              value: windSpeed
            });
          }

          if ('winddir' in q) {
            var windDirection = degrees2radians (parseFloat (q.winddir));
            var  path = 'environment.wind.angleApparent';;
            values.push ({
              path: path,
              value: windDirection
            });
          }

          app.handleMessage('signalk-ecowitt', {
            updates: [
              {
                values: values
              }
            ]
          });
        });
      } else {
        res.end();
      }
    });
    server.listen(options.port);
  };

  plugin.stop = function () {
    server.close();
  };

  plugin.schema = {
    type: 'object',
    required: ['port'],
    properties: {
      port: {
        type: 'number',
        title: 'Server Port',
        default: 1923
      },
      tempinf: {
        type: 'string',
        title: 'signalk key for gw2000 internal temperature',
        default: 'environment.ecowitt.inside.temperature'
      },
      humidityin: {
        type: 'string',
        title: 'signalk key for gw2000 internal humidity',
        default: 'environment.ecowitt.inside.humidity'
      },
      baromrelin: {
        type: 'string',
        title: 'signalk key for gw2000 internal relative pressure',
        default: 'environment.ecowitt.inside.relpressure'
      },
      baromabsin: {
        type: 'string',
        title: 'signalk key for gw2000 internal absolute pressure',
        default: 'environment.ecowitt.inside.abspressure'
      },
      tempf: {
        type: 'string',
        title: 'signalk key for gw2000 external temperature',
    default: 'environment.ecowitt.outside.temperature'
      },
      humidity: {
        type: 'string',
        title: 'signalk key for gw2000 external humidity',
        default: 'environment.ecowitt.outside.humidity'
      },
      temp1: {
        type: 'string',
        title: 'SignalK key for CH1 temperature',
        default: 'environment.ecowitt.1.temperature'
      },
      humidity1: {
        type: 'string',
        title: 'SignalK key for CH1 humidity',
        default: 'environment.ecowitt.1.humidity'
      },
      temp2: {
        type: 'string',
        title: 'SignalK key for CH2 temperature',
        default: 'environment.ecowitt.2.temperature'
      },
      humidity2: {
        type: 'string',
        title: 'SignalK key for CH2 humidity',
        default: 'environment.ecowitt.2.humidity'
      },
      temp3: {
        type: 'string',
        title: 'SignalK key for CH3 temperature',
        default: 'environment.ecowitt.3.temperature'
      },
      humidity3: {
        type: 'string',
        title: 'SignalK key for CH3 humidity',
        default: 'environment.ecowitt.3.humidity'
      }
    }
  };

  return plugin;
};

