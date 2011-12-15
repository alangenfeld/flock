
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

var num_flocks = 0;

function clearQueue(content) {
  // TODO add check for trolls in the queue (if two haters are in the same we
  // need some behavior
  if (content.queue.length == 0) {
    return;
  }
  if (content.queue.length == 1 && content.flocks.length > 1) {
    // make sure we actually *can* pick this flock (because of haters)
    console.log("Only 1 in queue, picking flock");
    client = content.queue[0];
    content.pickFlock(client[0], client[1], true);
    content.queue = [];
    return;
  }

  // we have more than one person, make a new room
  // or we have no rooms...
  // ignore trolls for now

  var f = new Flock();
  content.addFlock(f);
  for(var k in content.queue) {
    client = content.queue[k][0];
    console.log("clearQueue putting in flock; client : " + client);
    content.forceFlock(client, f.id);
  }
  content.queue = [];
}

var Content = Class({
    '__construct': function(uid, type) {
        this.id = String(uid);
        this.type = type;
        this.flocks = [];
        this.queue = [];
        setInterval(clearQueue, 3000, this);
    },

    'addFlock': function(flock) {
      this.flocks.push(flock);
    },

    'forceFlock': function(client, fid) {
      // check for trolls?
      console.log("Adding " + client.id + " to a flockk " + fid);
      var flock = _.find(this.flocks, function(x) { return x.id == Number(fid); });
      if (flock == "undefined") {
        return;
      }
      for (var f in this.flocks) {
        this.flocks[f].removeClient(client);
      }
      flock.addClient(client);
      console.log("added client to room " + fid);
    },

    'pickFlock': function(client, current, force) {
      // TODO check for trolls
      console.log("pickFlock client: " + client);
      for (var f in this.flocks) {
        this.flocks[f].removeClient(client);
      }
      possible = _.reject(this.flocks, 
        function(x) { 
          return (force && x.clients.length > 10) || x.id == Number(current); 
        });

      if (possible.length == 0) {
        console.log("No possible rooms... put back in queue");
        this.queue.push([client, current]);
      } else {
        console.log("looking for smallest");
        room = _.reduce(possible, 
          function(memo, o) { 
            return (o.clients.length < memo.clients.length) ? o : memo; 
          }, 
          possible[0] 
        );

        this.forceFlock(client, room.id);
      }
    }
});

var Flock = Class({
    '__construct': function() {
        this.id = num_flocks++;
        this.name = "Flock #" + (this.id);
        this.uids = [];
        this.messages = [];
        this.clients = [];
    },

    /**
     * Send a cmd with data to all clients on this object
     */
    'broadcast': function(cmd, data) {
        for (var i = 0; i < this.clients.length; i++) {
            this.clients[i].send(cmd, data);
        }
    },

    'removeClient': function(client) {
        this.clients = _.without(this.clients, client);
    },
    
    'addMessage': function(client) {
        this.messages.push({cl: client, count: 0, voters: {}});
        return this.messages.length-1;
    },
    
    'rateMessage': function(client, mid, change) {
        var msg = this.messages[mid];
        // so people can't vote in one direction more than once...

        if (client.id in msg.voters) {
            if (msg.voters[client.id] == change)
            return;
        }

        msg.voters[client.id] = change;
        msg.count += change;
        return msg.count;
    },
    
    'addClient': function(client) {
        if (client in this.clients){
            return;
        }
        console.log("made it");
        //notify everyone that new user has joined	
        for(var i = 0; i < this.clients.length; i++){
          this.clients[i].send("join", {uid: client.id, status:0});
        };
        
        this.clients.push(client);
        client.uidsIdx = this.uids.length;
        this.uids.push({uid: client.id, status: 0});
        client.setRoom(this);
        this.sendRoomInfo(client);
    },
    
    'removeClient': function(client) {
      if (!_.include(this.clients, client)) {
        console.log("REmove " + client.id + " from flock " + this.id);
          return;
      }

      for (var i in this.clients) {
        this.clients[i].send("part", {uid: client.id});
      }
        
      this.clients = _.without(this.clients, client);
      this.uids.splice(client.uidsIdx, 1);
    },

    'sendRoomInfo': function(client, kicked){
	    kicked = typeof(kicked) != "undefined" ? kicked : false;
        
        client.send("room_info", {
            id: this.id,
            name: this.name,
            clients: this.uids,
            kicked: kicked
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

    'kick': function() {
      this.send("kicked");
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
        this.content = null;
    },
    
    'setRoom': function(r) {
        this.room = r;
        this.info("Connected to Flock #" + Number(this.room.id));
    },
    
    'removeRoom': function() {
        if (!this.hasRoom())
            return;
        this.room.removeClient(this);		
        this.room = null;
    },

    'isTroll': function(cb) { 
      var that = this;
        db.getHaters(this, function (err, haters) { 
            var uids = _.map(
                that.room.uids, function(n) { return String(n.uid); }
            );
            console.log("UIDs: " + uids);
            cb(_.intersection(haters, uids).length / that.room.uids.length > .25);
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
    "create_flock",
    "pick_content",
    "remove_content",
    "has_flock",
    "msg",
    "action",
    "msg_vote",
    "mark_user"
];

/**
 * ChatServer is responsible for managing the clients and coordinating
 * messages between them.
 */
var Server = Class({
    
    '__construct': function() {
        this.contents = [];
        this.id2user = {};
        this.clients = [];
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
        this.id2user[uid] = client;
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
      client.send("has_flock", { hasFlock :true});
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
    
    'cmd_create_flock': function(client, data) {
        var cid  = String(data["contentID"]);
        var type = String(data["contentType"]);
        var current = String(data["current"]);
        var fid  = String(data["flockID"]);
        var cont = null;
        console.log(data);
        console.log("fid is equal to " + fid + "  cid = "+cid);

        var cont = new Content(cid, type);
        this.contents.push(cont);
        //this means the content didn't exist so url was wrong  
        
        client.removeRoom();
        client.removeContent();

        console.log("normal addclient");
        cont.pickFlock(client, current, false);
        client.setContent(cont);
    },
    
    'cmd_pick_content': function(client, data) {
        var cid  = String(data["contentID"]);
        var type = String(data["contentType"]);
        var current = String(data["current"]);
        var fid  = String(data["flockID"]);
        var cont = null;
        console.log(data);
        console.log("fid is equal to " + fid + "  cid = "+cid);

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

        if(fid == null || fid == "undefined"){
          console.log("normal addclient");
          cont.pickFlock(client, current, false);
        } else {
          console.log("other  addclient");
          cont.forceFlock(client, fid);
        }

        client.setContent(cont);
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
    },
    
    'cmd_mark_user': function(client, data) {
        var uid = Number(data["id"]);
        if (isNaN(uid))
            return;
       if (!(uid in this.id2user))
           return;
        
        console.log("Marking uid " + uid);
        
        var target = this.id2user[uid];
        db.markUser(client, target);
        
        var that = this;
        target.isTroll(function (troll) {
            if (troll) {
                console.log("Is troll: " + target.id); 
                target.kick();
                that.cmd_pick_content(target, 
                  {"contentID": target.content.id,
                   "contentType": target.content.type,
                   "current": target.room.id,
                   "fid": null });
            };
        });
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
