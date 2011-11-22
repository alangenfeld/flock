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

exports.addAssoc = function (fbid, fbid2, weight, cb) {
  client.set("graph:" + fbid + ":" + fbid2, weight);

  if (cb)
      client.incr("graph:" + fbid2 + ":incoming", 
		  function(err, x) { cb(x); });
  else
      client.incr("graph:" + fbid2 + ":incoming");
};

exports.init = function (id) {
    client.set("graph:" + id + ":incoming", "0");
};

exports.getAssoc = function (fbid, fbid2, callback) {
  client.get("graph:" + fbid + ":" + fbid2, function(err, x) { callback(x) });
};

exports.getNumIncomingAssocs = function (id, callback) {
    client.get("graph:" + id + ":incoming", function(err, x) { callback(x) });
};

exports.deleteAssoc = function (fbid, fbid2, cb) {
  client.del("graph:" + fbid + ":" + fbid2);

  if (cb)
      client.decr("graph:" + fbid2 + ":incoming", 
		  function(err, x) { cb(x); });
  else
      client.decr("graph:" + fbid2 + ":incoming");
};

/*
exports.createUser = function(fbid) {
  return {id:fbid}
}

exports.addFriends = function(fbid, friends) {
  for(var idx in friends) {
    exports.save(friends[idx], exports.createUser(friends[idx]))
    exports.addAssoc(fbid, friends[idx], 1)
    exports.addAssoc(fbid, friends[idx], 1)
  }
}

exports.activateRoom = function(sid) {
  client.sadd("rooms", sid)
}

exports.joinRoom = function(sid, fbid) {
  client.sadd("rooms", sid)
  client.sadd("rooms:" + sid, fbid);
}

exports.partRoom = function(sid, fbid) {
  client.srem("rooms:" + sid, fbid);
  client.scard("rooms:" + sid, function(err, card) { 
      if (card == 0) {
        client.srem("rooms", sid)
      }
    }
}
*/
