var alexa = require('alexa-app');
var request = require('request-promise');
var express = require('express');

var express_app = express();

var app = new alexa.app('connect');
app.express({ expressApp: express_app });

app.pre = function (request, response, type) {
    if (request.applicationId != "amzn1.ask.skill.33d79728-0f5a-44e7-ae22-ccf0b0c0e9e0") {
        throw "Invalid applicationId";
    }
};

app.intent('PlayIntent', {
    "utterances": [
        "play",
        "resume",
        "continue"
    ]
},
    function (req, res) {
        request.put("https://api.spotify.com/v1/me/player/play").auth(null, null, true, req.getSession().get("accessToken"));
        res.say('Playing');
    }
);

app.intent('PauseIntent', {
    "utterances": [
        "pause"
    ]
},
    function (req, res) {
        request.put("https://api.spotify.com/v1/me/player/pause").auth(null, null, true, req.getSession().get("accessToken"));
        res.say('Paused');
    }
);

app.intent('GetDevicesIntent', {
    "utterances": [
        "devices",
        "list",
        "search",
        "find"
    ]
},
    function (req, res) {
        return request.get({
            url: "https://api.spotify.com/v1/me/player/devices",
            auth: {
                "bearer": req.getSession().get("accessToken")
            },
            json: true
        })
            .then(function (body) {
                var devices = body.devices || [];
                var deviceNames = [];
                res.say("I found these connect devices:");
                for (var i = 0; i < devices.length; i++) {
                    //Number each device
                    deviceNames.push((i + 1) + ". " + devices[i].name);
                    //Add the device number to JSON
                    devices[i].number = (i + 1);
                }
                //Comma separated list of device names
                res.say([deviceNames.slice(0, -1).join(', '), deviceNames.slice(-1)[0]].join(deviceNames.length < 2 ? '' : ', and '));
                req.getSession().set("devices", devices);
                res.shouldEndSession(false);
            })
            .catch(function (err) {
                console.error('error:', err.message);
            });
    }
);

app.intent('DevicePlayIntent', {
    "slots": {
        "DEVICENUMBER": "AMAZON.NUMBER"
    },
    "utterances": [
        "play on {-|DEVICENUMBER}",
        "play on number {-|DEVICENUMBER}",
        "play on device {-|DEVICENUMBER}",
        "play on device number {-|DEVICENUMBER}"
    ]
},
    function (req, res) {
        if (req.hasSession()) {
            if (req.slot("DEVICENUMBER")) {
                var deviceNumber = req.slot("DEVICENUMBER");
                var devices = req.getSession().get("devices") || [];
                var deviceId, deviceName;
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].number == deviceNumber) {
                        deviceId = devices[i].id;
                        deviceName = devices[i].name;
                    }
                }
                request.put({
                    url: "https://api.spotify.com/v1/me/player",
                    auth: {
                        "bearer": req.getSession().get("accessToken")
                    },
                    body: {
                        "device_ids": [
                            deviceId
                        ],
                        "play": true
                    },
                    json: true
                });
                res.say("Playing on device " + deviceNumber + ": " + deviceName);
            }
        }
    });

express_app.use(express.static(__dirname));
express_app.get('/', function (req, res) {
    res.redirect('https://github.com/thorpelawrence/alexa-spotify-connect');
});

app.intent('DeviceTransferIntent', {
    "slots": {
        "DEVICENUMBER": "AMAZON.NUMBER"
    },
    "utterances": [
        "transfer to {-|DEVICENUMBER}",
        "transfer to number {-|DEVICENUMBER}",
        "transfer to device {-|DEVICENUMBER}",
        "transfer to device number {-|DEVICENUMBER}"
    ]
},
    function (req, res) {
        if (req.hasSession()) {
            if (req.slot("DEVICENUMBER")) {
                var deviceNumber = req.slot("DEVICENUMBER");
                var devices = req.getSession().get("devices") || [];
                var deviceId, deviceName;
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].number == deviceNumber) {
                        deviceId = devices[i].id;
                        deviceName = devices[i].name;
                    }
                }
                request.put({
                    url: "https://api.spotify.com/v1/me/player",
                    auth: {
                        "bearer": req.getSession().get("accessToken")
                    },
                    body: {
                        "device_ids": [
                            deviceId
                        ]
                    },
                    json: true
                });
                res.say("Transferring to device " + deviceNumber + ": " + deviceName);
            }
        }
    });

//Only listen if run directly, not if required as a module
if (require.main === module) {
    var port = process.env.PORT || 8888;
    console.log("Listening on port " + port);
    express_app.listen(port);
}

module.exports = app;
