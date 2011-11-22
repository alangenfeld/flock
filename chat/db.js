
var sys = require("sys");
var client = require("redis").createClient();

exports.client = client;

exports.save = function(key, obj) {
  client.set(key, obj);
};

exports.load = function (key, callback) {
  client.get(key, callback);
};

exports.addAssoc = function (fbid, fbid2, weight) {
  client.set("graph:" + fbid + ":" + fbid2, weight);
  client.get("graph:" + fbid + ":incoming",
	     function(err, x) {
		 var num = Number(x);
		 num += 1;
		 client.set("graph:" + fbid + ":incoming", num);
	     });
};

exports.getAssoc = function (fbid, fbid2, callback) {
  client.get("graph:" + fbid + ":" + fbid2, function(err, x) { callback(x) });
};

exports.getNumIncomingAssocs = function (fbid, fbid2, callback) {
    client.get("graph:" + fbid + ":incoming", function(err, x) { callback(x) });
};

exports.deleteAssoc = function (fbid, fbid2) {
  client.del("graph:" + fbid + ":" + fbid2);
  client.get("graph:" + fbid + ":incoming",
	     function(err, x) {
		 var num = Number(x);
		 num -= 1;
		 client.set("graph:" + fbid + ":incoming", num);
	     });
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
