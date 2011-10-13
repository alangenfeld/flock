

sys = require("sys");
client = require("redis").createClient();

exports.client = client;

exports.save = function(key, obj) {
    client.set(key, obj);
}

exports.load = function (key, callback) {
    client.get(key, callback);
}

exports.addAssoc = function (fbid, fbid2, weight) {
    client.zadd("graph:" + fbid, weight, fbid2);
}

exports.hasAssoc = function (fbid, fbid2, callback) {
    client.zrevrank("graph:" + fbid, fbid2, function(err, x) { callback(x != null) });
}

exports.deleteAssoc = function (fbid, fbid2) {
    client.zrem(fbid, fbid2);
}

exports.createUser = function(fbid) {
    return {id:fbid};
}

exports.addFriends = function(fbid, friends) {
    for(var idx in friends) {
        exports.save(friends[idx], exports.createUser(friends[idx]))
        exports.addAssoc(fbid, friends[idx], 1)
        exports.addAssoc(fbid, friends[idx], 1)
    }
}

exports.activateRoom = function(sid) {
    client.sadd("rooms", sid);
}

exports.joinRoom = function(sid, fbid) {
    client.sadd("rooms", sid)
    client.sadd("rooms:" + sid, fbid);
}

exports.partRoom = function(sid, fbid) {
    client.srem("rooms:" + sid, fbid);
    client.scard("rooms:" + sid, function(err, card) { 
        if (card == 0) {
            client.srem("rooms", sid);
        }
    });
}
