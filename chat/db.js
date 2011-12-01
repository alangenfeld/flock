
var sys = require("sys");
var redis =  require("redis");
var client = redis.createClient();

exports.client = client;

/*** VOTING ***/

exports.markUser = function(origin, target) {
    client.sadd("marked:" + origin.id, target.id); // list of people the marker has marked
    client.sadd("marks:" + target.id, origin.id); // list of people the target has been marked by
};

exports.getHaters = function(user, callback) {
    client.smembers("marks:" + user.id, callback);
};

exports.unmarkUser = function(origin, target) {
    client.srem("marked:" + origin.id, target.id);
    client.srem("marks:" + origin.id, target.id);
};

exports.addPoints = function(user, count) {
    client.incrby("score:" + user.id, count);
};

