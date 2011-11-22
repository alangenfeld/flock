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
	    var selectedFlock = null;
	    var fewestTrolls = MAX_ROOM_CLIENTS + 1; //not possible

	    if (this.rooms.length == 0)
		    selectedFlock = this.rooms[0] = new Flock(global_room_count++);
	    else {
		    for (var i = 0; i < this.rooms.length; i++){
                
		    var numTrolls = 0;
		        var clientsList = this.rooms[i].getClients();
                
		        log.info("NUM PEOPLE = " + clientsList.length);
		        
		        // count number of trolls in each room
		        for(var k = 0; k < clientsList.length; k++){
			        db.getAssoc(client.id, clientsList[k], function(weight){
				// count number of trolls in room
				        if(weight == -1){
				            numTrolls++;
				        }
			        });
			        
		        }
				
		        if(numTrolls < fewestTrolls){
			        fewestTrolls = numTrolls;
			        selectedFlock = this.rooms[i];
		    }
                
		    }
            
		    if (selectedFlock == null) {
		        console.log("-- Creating new room");
		        selectedFlock = new Flock(global_room_count++);
		        this.rooms.push(selectedFlock);
		    }
	    }

	    this.clients.push(client);
	    selectedFlock.addClient(client);
	    return selectedFlock;
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
		
		//notify everyone that new user has joined	
		for(var i = 0; i < this.clients.length; i++){
			this.clients[i].socket.emit("join", {cid:client.id, status:0});
		};
		
		this.clients.push(client);
    },

    'sendRoomInfo': function(client){
	    //return listing of users in room to client
	    var that = this;
        
	    client.send("room_info", {room_name: that.name});
	    for(var i = 0; i < that.clients.length; i++){
	        // HACK HACK THE PLANET HACK
	        db.getAssoc(client.id, that.clients[j].id, function(weight){
		        if (weight == null)
			        weight = 0;
                
		        console.log("hack: ", that.clients[j].id, weight, j, i);
		        client.send("update_relation", {uid:that.clients[j].id, status:weight});
		    });
	        
	        //this.clients[i].socket.emit("room_info",{room_dudes,roomGraph});
	    }
	    //return roomGraph;
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
        this.id      = -1;
        this.content = null;
        this.room    = null;
        this.start   = (new Date()).getTime();
        this.acts    = 0;
        this.send    = socket.emit.bind(socket);
        this.on      = socket.on.bind(socket);
        this.friend_cids = [];
        this.friends      = {};
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
    
    'add_friends': function(cids) {
      this.friend_cids = cids;
      log.debug(this.friend_cids);
      for (var i = 0; i < cids.length; i++) {
        var cid = this.cids[i];
        if (cid in online_users) {
          this.friends[cid] = online_users[cid];
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
		
		for (var i in this.room.clients) {
			this.room.clients[i].socket.emit("part", {uid: this.id});
		}
		
        this.room = null;
    },
    
    'hasRoom': function() { return this.room !== null; },
    'loggedIn': function() { return this.id !== -1; },
    'hasContent': function() { return this.content !== null; } 
});

// V0 client -> server commands
var COMMANDS = [
    "login",
    "disconnect",
    "pick_content",
    "remove_content",
    "msg",
    "action",
    "add_friends",
    "set_status",
    "rm_edge",
    "set_edge",
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
	
	'cmd_disconnect': function(client, data) {
		client.removeRoom();
	},

    'cmd_set_status': function(client, data){
          var cid  = data["cid"];
          var setstatus  = data["status"];
          log.info("setstatus: " + setstatus + "   cid  " + cid);
          db.addAssoc(client.id, cid, setstatus);
    }
    ,

    'cmd_get_status': function(client, data){
          var cid  = data["cid"];
          log.info("getstatus:  cid  " + cid);
          db.getAssoc(client.id, cid, function(weight){
              var w=weight;
              if(weight == null){
                w = 0;
              }
              client.send("get_status",{"status":w});
              });
    }
    ,

    'cmd_set_edge': function(client, data){
	var id  = data["id"];
	log.info("setedge: " + id);
	db.addAssoc(client.id, id, "1", function(num) {
		chat.get_inc(client, data, num);
	    });
    }
    ,
    
    'cmd_rm_edge': function(client, data){
	var id  = data["id"];
	log.info("rmedge: " + id);
	db.deleteAssoc(client.id, id, function(num) {
		chat.get_inc(client, data, num);
	    });
    }
    ,

    'cmd_get_inc': function(client, data){
	var id  = data["id"];
	log.info("getinc: " + id);
	db.getNumIncomingAssocs(id, function(num){
		var w=num;
		if(num == null){
		    w = 0;
		}
		client.send("update_count",{"msgID":id, "cnt":w });
	    });
    }
    ,
    
    'get_inc': function(client, data, num){
	var id  = data["id"];
	if (num)
	    client.room.broadcast("update_count",{"msgID":id, "cnt":num });
	else
	    db.getNumIncomingAssocs(id, function(num){
		var w=num;
		if(num == null){
		    w = 0;
		}
		client.room.broadcast("update_count",{"msgID":id, "cnt":num });
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
        client.setContent(cont);
        client.setRoom(room);
	    room.sendRoomInfo(client);
        //client.send("room_info", {room_name:room.name,room_dudes:dudes});
    },
    
    'cmd_remove_content':function(client) {
        client.removeRoom();
        client.removeContent();
    },

    'cmd_msg': function(client, data) {
        client.act();

	    db.getAssoc(client.id, 0, function(msgNum) {
		    msgNum = Number(msgNum) + 1;
		    if (msgNum >= 999999)
		        msgNum = 0;
		    db.addAssoc(client.id, 0, msgNum);
		    db.init(msgNum);
		    var newID = (client.id * 1000000) + msgNum;
		    client.room.broadcast("msg",
				                  {msg:data.msg, userID:client.id, msgID:newID});
	    });
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
