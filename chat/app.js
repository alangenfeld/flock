
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
io.set("log level", 0);

var log = require('winston');
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
    'override __construct': function(uid, type) {
        this._super();
        this.id = uid;
        this.type = type;
        this.rooms = [];
    },

    'addClientExistingRoom': function(client, fid) {

        var selectedFlock = null;
        console.log("adding client to existing room hopefully");
        for (var i = 0; i < this.rooms.length; i++) {    
            console.log("i = "+ i + " fid = " + fid);
            if(this.rooms[i].id.toString() == fid) {
                selectedFlock = this.rooms[i];
                selectedFlock.addClient(client);
                console.log("added client to room " + i);
                this.clients.push(client);
	              selectedFlock.addClient(client);
	              return selectedFlock;
            }
        }
	      return null;
    },

	'addClient': function(client) {
/*
        var selectedFlock = null;
	    var fewestTrolls = MAX_ROOM_CLIENTS + 1; //not possible
 
	    if (this.rooms.length == 0)
		    selectedFlock = this.rooms[0] = new Flock(global_room_count++);
	    else {
		    for (var i = 0; i < this.rooms.length; i++){
                
		        var numTrolls = 0;
                
		        log.info("NUM PEOPLE = " + rooms[i].clients.length);
		        
		        // count number of trolls in each room
		        for(var k = 0; k < rooms[i].clients.length; k++){
			        db.getAssoc(client.id, rooms[i].clients[k].id, function(weight) {
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
*/
        
        var selectedFlock = null;
        var leastPeople   = MAX_ROOM_CLIENTS;
        
        for (var i = 0; i < this.rooms.length; i++) {
            var num = this.rooms[i].numClients();
            if (num < leastPeople) {
                selectedFlock = this.rooms[i];
                leastPeople = num;
            }
        }
        
        if (selectedFlock == null) {
            console.log("- Creating new flock");
            selectedFlock = new Flock(global_room_count++);
            this.rooms.push(selectedFlock);
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
        this.name = "Flock #" + (fid + 1);
        this.uids = [];
        this.messages = [];
    },
    
    'addMessage': function(client) {
        this.messages.push({cl: client, count: 0, voters: {}});
        return this.messages.length-1;
    },
    
    'rateMessage': function(client, mid, change) {
        var msg = this.messages[mid];
        // so people can't vote more than once...
        if (client.id in msg.voters)
            return;
        msg.voters[client.id] = true;
        msg.count += change;
        return msg.count;
    },
    
    'addClient': function(client) {
        if (client in this.clients){
            return;
        }
		
		//notify everyone that new user has joined	
		for(var i = 0; i < this.clients.length; i++){
			this.clients[i].send("join", {uid: client.id, status:0});
		};
		
		this.clients.push(client);
        client.uidsIdx = this.uids.length;
        this.uids.push({uid: client.id, status: 0});
    },
    
    'override removeClient': function(client) {
        this._super(client);
        
		for (var i in this.clients) {
			this.clients[i].send("part", {uid: client.id});
		}
        
        this.uids.splice(client.uidsIdx, 1);
    },

    'sendRoomInfo': function(client){
	    //return listing of users in room to client
        
        client.send("room_info", {
            id: this.id,
            name: this.name,
            clients: this.uids
        });
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
        this.id      = -1;
        this.content = null;
        this.room    = null;
        this.start   = (new Date()).getTime();
        this.acts    = 0;
        this.send    = socket.emit.bind(socket);
        this.on      = socket.on.bind(socket);
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
        this.room.removeClient(this);		
//        this.room = null;
    },

    'isTroll': function(cb) { 
      var that = this;
        db.getHaters(this, function (err, haters) { 
          cb(_.intersection(haters, that.room.uids.length).length / that.room.uids.length > .25);
        });
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
    "has_flock",
    "remove_content",
    "msg",
    "action",
    "msg_vote"
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
        var len = COMMANDS.length;
        for (var i = 0; i < len; i++)
            this.registerCallback(cl, COMMANDS[i]);
    },
	
    'registerCallback': function(client, cmd) {
        var cmdStr = "cmd_" + cmd;
        var that = this;
        client.on(cmd, function (data) {
            log.info(" Received command: " + cmd);
            that[cmdStr].call(that, client, data);
        });        
    },

    'cmd_login': function(client, data) {
        var uid = Number(data["userID"]);
        if (uid == -1)
            throw new Exception("Client tried to login with ID -1");
        client.logIn(uid);
        log.info("Client logged in with ID " + uid);
    },
    
	
	'cmd_disconnect': function(client, data) {
		client.removeRoom();
        client.removeContent();
	},

    'cmd_has_flock': function(client, data) {
        var cid  = String(data["contentID"]);
        var type = String(data["contentType"]);
        var fid = String(data["flockID"]);
        //(hasRoom()&&hasContent())
		client.send("has_flock", {hasFlock:true});
    },

    'cmd_msg_vote': function(client, data) {
	    var id     = Number(data["id"].substr(3));
        var change = Number(data["change"]); 
        if (change != 1 && change != -1)
            return;
        var newCount = client.room.rateMessage(client, id, change);
        client.room.broadcast("update_count", {
            msgID: id,
            cnt: newCount
        });
    },
    
    'cmd_pick_content': function(client, data) {
        var cid  = String(data["contentID"]);
        var type = String(data["contentType"]);
        var fid  = String(data["flockID"]);
        var cont = null;
console.log(data);
        console.log("1fid is equal to " + fid + "  cid = "+cid);

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
            //this means the content didn't exist so url was wrong  
            fid = null;
        }
        
        client.removeRoom();
        client.removeContent();

        //room should be set to fid if it exists
        var room;
        if(fid == null || fid == "undefined"){
            room = cont.addClient(client);
        } else {
            room = cont.addClientExistingRoom(client, fid);
        }

        client.setContent(cont);
        client.setRoom(room);
        room.sendRoomInfo(client);
    },

    'cmd_remove_content':function(client) {
        client.removeRoom();
        client.removeContent();
    },

    'cmd_msg': function(client, data) {
        client.act();
        
		client.room.broadcast("msg", {
            msg:data.msg.toString(), userID:client.id, msgID:client.room.addMessage(client)
        });
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
