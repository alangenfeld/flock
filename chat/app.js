// Copyright 2011 Remzi's Entrepreneurs. Or something. All rights potentially reserved.

/**
 * @fileoverview Node backend
 * @author jonanin@gmail.com (Jon 'Jonanin' Morton)
 */

var Class   = require("structr"),
    sio     = require("socket.io"),
    _       = require("underscore"),
    app     = require("./web.js"),
    db      = require("./db.js");

var io = sio.listen(app);

io.set("log level", 1);

var log = require('winston');
log.remove(log.transports.Console);
log.add(log.transports.File, { filename: 'flock.log' });

var ClientList = Class({
    '__construct': function() {
        this.clients = [];
        this.start = (new Date()).getTime();
    },
    
    'removeClient': function(client) {
        this.clients = _.without(this.clients, client);
    },
    
    'numClients': function () {
        return this.clients.length;
    },

    'getClients': function(){
		var clientData = [];
		for(var i = 0; i < this.clients.length; i++){
			clientData.push(this.clients[i].id);
		}
		return clientData;
    },
    /**
     * Send a cmd with data to all clients on this object
     */
    'broadcast': function(cmd, data) {
        for (var i = 0; i < this.clients.length; i++) {
            this.clients[i].send(cmd, data);
        }
    },
    
    /**
     * Return the total of all client activity from the start
     * @return acts per minute
     */
    'getActivity': function() {
        // TODO: cache this
        return _.reduce(this.clients, function(sum, c) {
            return sum + c.getActivity();
        }, 0);
    }
});

var MAX_ROOM_CLIENTS = 20;
var global_room_count = 0;

var Content = ClientList.extend({
    'override __construct': function(cid, type) {
        this._super();
        this.id = cid;
        this.type = type;
        this.rooms = [];
    },
    
    'addClient': function(client) {
        var room = null;
        if (this.rooms.length == 0)
            room = this.rooms[0] = new Flock(global_room_count++);
        else {
            for (var i = 0; i < this.rooms.length; i++)
                if (this.rooms[i].numClients() < MAX_ROOM_CLIENTS) {
                    room = this.rooms[i];
                    break;
                }
            if (room == null) {
                console.log("-- Creating new room");
                room = new Flock(global_room_count++);
                this.rooms.push(room);
            }
        }
        this.clients.push(client);
        room.addClient(client);
        return room;
    }
});

var Flock = ClientList.extend({
    'override __construct': function(fid) {
        this._super();
        this.id = fid;
        this.name = "Flock #" + fid;
    },
    
    'addClient': function(client) {
        if (client in this.clients)
            return;

        this.clients.push(client.id);
		
		var userList = this.getClients();

		//notify everyone that new user has joined	
		for(var i = 0; i < this.clients.length; i++) {
			db.getAssoc(clients[i].id, client, function(weight) {
				this.clients[i].socket.emit("join", {uid:client.id,status:weight});
			});
		};
    },

	'getRoomGraph': function(client){
		//return listing of users in room to client
		var roomGraph = {}
		for(var i = 0; i < this.clients.length; i++){
			db.getAssoc(clients[i].id, client, function(weight){
				roomGraph.push({uid:clients[i].id,status:weight});
			});
			//this.clients[i].socket.emit("room_info",{room_dudes,roomGraph});
		}
		return roomGraph;
	}
});

var online_users = {};

/**
 * Represents a client connected to the server
 */
var Client = Class({
    /**
     * @param socket the Socket.IO socket object for this client
     * @param chat a reference to the ChatServer object
     */
    'override __construct': function(socket, server) {
        this.socket  = socket;
        this.server  = server;
        this.id     = -1;
        this.content = null;
        this.room    = null;
        this.start = (new Date()).getTime();
        this.acts = 0;
        this.send    = function(cmd, data) { this.socket.emit(cmd, data); };
        this.on      = function(ev, fn) { this.socket.on(ev, fn); };
        this.friend_fbids = [];
        this.friends = {};
    },
    
    'info': function(text) {
        this.send("msg", {"msg": text, userID: -1});
    },
    
    /**
     * Record one unit of activity on this client
     */
    'act': function() {
        this.acts += 1;
    },

    'online_friends' : function() {
      var list = {};
      for (var i = 0; i < this.friends.length; i++) {
        list[this.friends[i].id] = this.friends[id].fid;
      }
      return list;
    },
    
    'add_friends': function(fbids) {
      this.friend_fbids = fbids;
      log.debug(this.friend_fbids);
      for (var i = 0; i < fbids.length; i++) {
        var fbid = this.fbids[i];
        if (fbid in online_users) {
          this.friends[fbid] = online_users[fbid];
        }
      }
    },

    /**
     * Calculate the object's total activity
     * @return acts per minute
     */
    'getActivity': function() {
        return this.acts * 1000 * 60 / ((new Date()).getTime() - this.start);
    },
    
    /**
     * Set the user as logged in to the system
     * @param uid a unique ID representing the user
     */
    'logIn': function(uid) {
        this.id = uid;
        online_users[uid] = this;
    },
    
    'setContent': function(c) {
        this.content = c;
    },
    
    'removeContent': function() {
        if (!this.hasContent())
            return;
        this.content.removeClient(this);
        this.content = null;
    },
    
    'setRoom': function(r) {
        this.room = r;
        this.info("Connected to Room #" + this.room.id);
    },
    
    'removeRoom': function() {
        if (!this.hasRoom())
            return;
        this.info("Removed from Room #" + this.room.id);
        this.room.removeClient(this);
        this.room = null;
    },
    
    'hasRoom': function() { return this.room !== null; },
    'loggedIn': function() { return this.id !== -1; },
    'hasContent': function() { return this.content !== null; } 
});

// V0 client -> server commands
var COMMANDS = [
    "login",
    "pick_content",
    "remove_content",
    "msg",
    "action",
    "add_friends",
    "set_status",
    "get_status"
];

/**
 * ChatServer is responsible for managing the clients and coordinating
 * messages between them.
 */
var Server = ClientList.extend({
    
    'override __construct': function() {
        this._super();
        this.contents = [];
    },
    
    /**
     * add a new client for the server to listen to and broadcast to
     * @param cl instance of Client
     */
    'addClient': function(cl) {
        this.clients.push(cl);
        var that = this, len = COMMANDS.length;
        for (var i = 0; i < len; i++)
            this.registerCallback(cl, COMMANDS[i]);
    },
	
    'getUsersInFlock': function(){
      //needs implementation
    }
    ,
    
    'registerCallback': function(client, cmd) {
        var cmdStr = "cmd_" + cmd;
        var that = this;
        client.on(cmd, function (data) {
            log.info(" Received command: " + cmd);
            try {
                that[cmdStr].call(that, client, data);
            } catch (e) {
                log.info("Executing cmd " + cmd + "failed: " + e);
            }
        });        
    },

    'cmd_login': function(client, data) {
        var lid = Number(data["userID"]);
        if (lid == -1)
            throw new Exception("Client tried to login with ID -1");
        client.logIn(lid);
        log.info("Client logged in with ID " + lid);
    },

    'cmd_set_status': function(client, data){
          var fbid  = data["fbid"];
          var setstatus  = data["status"];
          log.info("setstatus: " + setstatus + "   fbid  " + fbid);
          db.addAssoc(client.id, fbid, setstatus);
    }
    ,

    'cmd_get_status': function(client, data){
          var fbid  = data["fbid"];
          log.info("getstatus:  fbid  " + fbid);
          db.getAssoc(client.id, fbid, function(weight){
              var w=weight;
              if(weight == null){
                w = 0;
              }
              client.send("get_status",{"status":w});
              });
    }
    ,
    
    'cmd_pick_content': function(client, data) {
        var cid  = String(data["contentID"]);
        var type = String(data["contentType"]);
        var cont = null;

        // try for existing instance of this Content
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].id == cid && this.contents[i].type == type) {
                cont = this.contents[i];
                break;
            }
        }
        
        // make a new one
        if (cont === null) {
            cont = new Content(cid, type);
            this.contents.push(cont);
        }
        
        client.removeRoom();
        client.removeContent();

        var room = cont.addClient(client);
		var dudes = room.getRoomGraph(client);
        client.setContent(cont);
        client.setRoom(room);
        client.send("room_info", {room_name:room.name,room_dudes:dudes});
    },
    
    'cmd_remove_content':function(client) {
        client.removeRoom();
        client.removeContent();
    },

    'cmd_msg': function(client, data) {
        client.act();
//        db.logChat(client.content.id, client.room.id, client.id, data.msg);
        client.room.broadcast("msg", {msg:data.msg, userID:client.id});
    },

    'cmd_add_friends': function(client, data) {
      client.add_friends(data['friends']);
    },
    
    'cmd_action': function(client, data) {
        var action = String(data["action"]);
        var extra  = ("extra" in data) ? String(data["extra"]) : "";
        
        if (action == "activity") {
            client.info(
                "Your activity: " + client.getActivity() + "<br />"+
                "Room activity: " + client.room.getActivity() + "<br />"+
                "Content activity: " +client.content.getActivity() + "<br />"+ 
                "Server activity: " + this.getActivity()
            );
        }
    }
});

var chat = new Server();

// Listen for new connections and create client
// objects to add to the server
io.sockets.on("connection", function(socket) {
    var cl = new Client(socket, chat);
    chat.addClient(cl);
});

log.info("Server started");
