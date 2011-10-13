
var redis = require("redis");
var client = redis.createClient();

exports.logChat = function(cid, rid, uid, msg) {
    var string = cid + ":" + rid + ":" + uid + ":" + msg;
    client.lpush("chat", string);
}
