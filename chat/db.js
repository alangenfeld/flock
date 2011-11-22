var sys = require("sys");
var redis =  require("redis");
var client = redis.createClient();

exports.client = client;

exports.save = function(key, obj) {
    client.set(key, obj);
};

exports.load = function (key, callback) {
    client.get(key, callback);
};

exports.createMessage = function(cid, mid) {
    client.set("r:" + cid + ":" + mid, 0);
};

exports.rateMessage = function(, mid, weight, cb) {
    client.incrby("r:" + cid + ":" + mid, weight, cb);
};

exports.markUser = function(clOrigin, clTarget) {
    client.incr("markc:" + cidTarget); // number of marks this user has
    client.lpush("marks:" + cidOrigin, cidTarget); // list of people the marker has marked
};

/*
exports.createUser = function(cid) {
  return {id:cid}
}

exports.addFriends = function(cid, friends) {
  for(var idx in friends) {
    exports.save(friends[idx], exports.createUser(friends[idx]))
    exports.addAssoc(cid, friends[idx], 1)
    exports.addAssoc(cid, friends[idx], 1)
  }
}

exports.activateRoom = function(sid) {
  client.sadd("rooms", sid)
}

exports.joinRoom = function(sid, cid) {
  client.sadd("rooms", sid)
  client.sadd("rooms:" + sid, cid);
}

exports.partRoom = function(sid, cid) {
  client.srem("rooms:" + sid, cid);
  client.scard("rooms:" + sid, function(err, card) { 
      if (card == 0) {
        client.srem("rooms", sid)
      }
    }
}
*/
