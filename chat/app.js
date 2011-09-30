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
/** @lends Client# */
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

var COMMANDS = [
    "pick_stream",
    "msg"
];

var ChatServer = Class(
/** @lends ChatServer# */
{
    /**
     * ChatServer is responsible for managing the clients and coordinating
     * messages between them.
     * @constructs
     */
    __construct: function() {
        this.clients = [];
    },
    
    /**
     * add a new client for the server to listen to and broadcast to
     * @param cl instance of Client
     */
    addClient: function(cl) {
        var that = this;
        this.clients.push(cl);
        for (var i in COMMANDS) {
            cl.on(COMMANDS[i], function (data) {
                that["cmd_" + COMMANDS[i]].apply(that, [cl, data]);
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
    
    cmd_msg: function(client, data) {
        this.broadcast("msg", {nick:data.nick,msg:data.msg});
    }
});

var chat = new ChatServer();

// Listen for new connections and create client
// objects to add to the server
io.sockets.on("connection", function(socket) {
    var cl = new Client(socket, chat);
    chat.addClient(cl);
    cl.send("msg", {nick:"**Server**", msg:"Connected."});
});

console.log("Server started");
