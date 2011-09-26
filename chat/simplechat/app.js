// Copyright 2011 Remzi's Entrepreneurs. Or something. All rights potentially reserved.

/**
 * @fileoverview Simple test chat server.
 * @author jonanin@gmail.com (Jon 'Jonanin' Morton)
 */

/*
 *  Uses Structr to provide a baisc class system for Javascript.
 * 
 * Socket.IO is used to provide a cross-browser and simple method for
 * client-server communication. It will use web-sockets, or flash, or ajax
 * in that order to try to establish a connection.
 * 
 * Uses express to render the client page.
 * 
 * Also using the underscore library which provides some basic algorithms
 * and functional programming utilities.
 * 
 * Using JSDoc for documentation, and following Google's javascript style
 * guide (somewhat...)
 *   see http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
 *   and http://code.google.com/p/jsdoc-toolkit/
 *   and https://github.com/micmath/jsdoc
 */

var Class   = require("structr"),
    sio     = require("socket.io"),
    express = require("express"),
    _       = require("underscore");

var app = express.createServer();

// configure express to serve static files and use jade tempalting
app.configure(function () {
	app.use(express.static(__dirname + "/public"));
	app.set("views", __dirname);
	app.set("view engine", "jade");
});

// express stuff
app.get("/", function (req, res) {
	res.render("index", {layout: false});
});

app.listen(3000, function () {
	var addr = app.address();
	console.log("  app listening on " + addr.address + ":" + addr.port);
});

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
	__construct: function(socket, chat) {
		this.socket = socket;
		this.chat   = chat;
		this.send   = function(cmd, data) { socket.emit(cmd, data) };
		this.on     = function(ev, fn) { this.socket.on(ev, fn); };
	}
});

var ChatServer = Class(
/** @lends ChatServer# */
{
	/**msg
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
		cl.on("msg", function(data) { that.cmd_msg(cl, data); });
	},
	
	/**
	 * Send a command to all clients not in except
	 * @param cmd the command string to send
	 * @param data javascript object to send
	 * @param except clients to not broadcast to
	 */
	broadcast: function(cmd, data, except) {
		except = except || [];
		for (var cl in _.difference(this.clients, except))
			this.clients[cl].send(cmd, data);
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
