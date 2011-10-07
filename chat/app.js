// Copyright 2011 Remzi's Entrepreneurs. Or something. All rights potentially reserved.

/**
 * @fileoverview Node backend
 * @author jonanin@gmail.com (Jon 'Jonanin' Morton)
 */

var Class   = require("structr"),
    sio     = require("socket.io"),
    _       = require("underscore"),
    app     = require("./web.js");

var io = sio.listen(app);

io.set("log level", 0);

var ClientList = Class({
    '__construct': function() {
        this.clients = [];
    },
    
    'broadcast': function(cmd, data) {
        for (var i = 0; i < this.clients.length; i++) {
            this.clients[i].send(cmd, data);
        }
    }
});

var Content = ClientList.extend({
    'override __construct': function(cid, type) {
        this._super();
        this.id = cid;
        this.type = type;
        this.room = new Room();
    },
    
    'addClient': function(client) {
        this.clients.push(client);
        this.room.addClient(client);
        return this.room;
    }
});

var Room = ClientList.extend({
    'override __construct': function() {
        this._super();
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
        this.send    = function(cmd, data) { this.socket.emit(cmd, data); };
        this.on      = function(ev, fn) { this.socket.on(ev, fn); };
    },
    
    'logIn': function(uid) {
        this.id = uid;
    },
    
    'setContent': function(c) {
        this.content = c;
    },
    
    'setRoom': function(r) {
        this.room = r;
    },
    
    'inRoom': function() { return this.room !== null; },
    'loggedIn': function() { return this.id !== -1; },
    'hasContent': function() { return this.content !== null; } 
});

// V0 client -> server commands
var COMMANDS = [
    "login",
    "pick_content",
    "msg"
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
            console.log(" Received command: " + cmd);
            try {
                that[cmdStr].call(that, client, data);
            } catch (e) {
                console.log("Executing cmd " + cmd + "failed: " + e);
            }
        });        
    },

    'cmd_login': function(client, data) {
        var lid = Number(data["userID"]);
        client.logIn(lid);
        console.log("Client logged in with ID " + lid);
    },
    
    'cmd_pick_content': function(client, data) {
        var cid  = Number(data["contentID"]);
        var type = Number(data["contentType"]);
        var cont = null;
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].id == cid && this.contents[i].type == type) {
                cont = this.contents[i];
                break;
            }
        }
        if (cont === null) {
            cont = new Content(cid, type);
            this.contents.push(cont);
        }

        var room = cont.addClient(client);
        client.setContent(cont);
        client.setRoom(room);
        client.send("room_info", {room_name:"foo"});
    },
    
    'cmd_msg': function(client, data) {
        client.room.broadcast("msg", {msg:data.msg, userID:client.id});
    }
});

var chat = new Server();

// Listen for new connections and create client
// objects to add to the server
io.sockets.on("connection", function(socket) {
    var cl = new Client(socket, chat);
    chat.addClient(cl);
});

console.log("Server started");
