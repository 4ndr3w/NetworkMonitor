var async = require("async"),
    config = require("./config"),
    fs = require("fs"),
    request = require("request"),
    Ping = require("net-ping"),
    ping = Ping.createSession();

var statusFile = "currentUptime.json";

if ( !fs.existsSync(statusFile) )
{
    fs.writeFileSync(statusFile, "{}");
}

var currentState = JSON.parse(fs.readFileSync(statusFile));

function sendMsg(msg, color)
{
    request("https://api.hipchat.com/v1/rooms/message", {
        method: "GET",
        qs: {
            auth_token: config.hipchat.token,
            room_id: config.hipchat.room,
            from: config.hipchat.from,
            notify: 0,
            color: color,
            message_format: "text",
            message: msg
        }
    })
}


async.eachSeries(config.services, function(service, next)
{
    if ( service.type == "ping" ) {
        ping.pingHost(service.host, function (pingError, target) {
            if ( currentState[service.name] == undefined )
                currentState[service.name] = (pingError?false:true);

            if (pingError && currentState[service.name]) {
                sendMsg(service.name + " (" + service.host + ") is now offline - " + pingError, "red");
                currentState[service.name] = false;
            }
            else if (!pingError && !currentState[service.name]) {
                sendMsg(service.name + " (" + service.host + ") is now online", "green");
                currentState[service.name] = true;
            }
            next(null);
        });
    }
}, function(err)
{
    fs.writeFileSync(statusFile, JSON.stringify(currentState));
});