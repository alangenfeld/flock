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

var Client = Class(
{
    /**
     * Represents a client connected to the server
     * @constructs
     * @param socket the Socket.IO socket object for this client
     * @param chat a reference to the ChatServer object
     */
    __construct: function(socket, chat, fbid) {
        this.socket = socket;
        this.chat   = chat;
        this.fbid   = fbid;
        this.sid    = -1;
        this.send   = function(cmd, data) { this.socket.emit(cmd, data) };
        this.on     = function(ev, fn) { this.socket.on(ev, fn); };
    },
    
    setStream: function(sid) {
        this.sid = sid;
    }
});

// V0 client -> server commands
var COMMANDS = [
    "login",
    "pick_stream",
    "msg"
];

var ChatServer = Class(
{
    /**
     * ChatServer is responsible for managing the clients and coordinating
     * messages between them.
     */
    __construct: function() {
        this.clients = [];
    },
    
    /**
     * add a new client for the server to listen to and broadcast to
     * @param cl instance of Client
     */
    addClient: function(cl) {
        this.clients.push(cl);
        var that = this, len = COMMANDS.length;
        for (var i = 0; i < len; i++) {
            var cmd = COMMANDS[i], cmdStr = "cmd_" + cmd;
            cl.on(cmd, function (data) {
                try {
                    that[cmdStr].call(that, cl, data);
                } catch (e) {
                    console.log("Executing cmd " + cmd + "failed: " + e);
                }
            });
        }
    },
    
    /**
     * Send a command to all clients not in except
     * @param cmd the command string to send
     * @param data javascript object to send
     * @param except clients to not broadcast to
     */
    broadcast: function(cmd, data, except) {
        except = except || [];
        var diff = _.difference(this.clients, except);
        for (var cl in diff)
            diff[cl].send(cmd, data);
    },

    cmd_login: function(cleint, data) {
        
    },
    
    cmd_pick_stream: function(client, data) {
        
    }
});

var chat = new ChatServer();

// Listen for new connections and create client
// objects to add to the server
io.sockets.on("connection", function(socket) {
    var cl = new Client(socket, chat);
    chat.addClient(cl);
});

console.log("Server started");
