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

var MAX_ROOM_CLIENTS = 2;
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
            room = this.rooms[0] = new Room(global_room_count++);
        else {
            for (var i = 0; i < this.rooms.length; i++)
                if (this.rooms[i].numClients() < MAX_ROOM_CLIENTS) {
                    room = this.rooms[i];
                    break;
                }
            if (room == null) {
                console.log("-- Creating new room");
                room = new Room(global_room_count++);
                this.rooms.push(room);
            }
        }
        this.clients.push(client);
        room.addClient(client);
        return room;
    }
});

var Room = ClientList.extend({
    'override __construct': function(rid) {
        this._super();
        this.id = rid;
        this.name = "Room #" + rid;
    },
    
    'addClient': function(client) {
        if (client in this.clients)
            return;
        this.clients.push(client);
    }
});

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
    
    'add_friends': function(fbids) {
      log.debug(fbids);
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
    "add_friends"
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
        client.send("room_info", {room_name:room.name});
    },
    
    'cmd_remove_content':function(client) {
        client.removeRoom();
        client.removeContent();
    },

    'cmd_msg': function(client, data) {
        client.act();
        db.logChat(client.content.id, client.room.id, client.id, data.msg);
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
