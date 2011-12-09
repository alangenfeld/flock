var socket = 0;
var fbid_names = {};

var Chat = {
    init : function() {
        socket.on("msg", this.getMsg.bind(this));
        $("#send").submit(this.sendMsg.bind(this));
        this.uid = 0;
        this.txt = $("#text");
    },
    
    loggedIn : function(uid) {
        socket.emit("login", {"userID":uid});
        this.uid = uid;
        globals.video.init();
        $("#landing").hide();
        $("#side").hide();
        $("#container").show();
    },
    
    serverMsg : function(msg) {
        $("#text").append("<div class=\"message\">" +
                          "<b>Server:</b> " + msg + "<br />" + 
                          "</div>"
                         );
    
        this.txt.prop({ scrollTop: this.txt.prop("scrollHeight")});
    },
    
    upvoteClicked: function(e) {
		var mid = $(e.currentTarget).parent().attr("id");
		if (! $(e.currentTarget).hasClass("selected")) {
			socket.emit("msg_vote", {id: mid, change: 1});
		    $(e.currentTarget).addClass("selected");
		} else {
	        socket.emit("msg_vote", {id: mid, change: 0});
		    $(e.currentTarget).removeClass("selected");
		}
    },
    
    addMsg : function(uid, name, mid, body) {
        var status = Room.getStatus(uid);
        var troll;

        this.txt.append("<div class=\"message\" id=\"msg" + mid + "\"" +
                          " uid=\"" + uid + "\">" +
                          "<span class=\"troll\">X</span>" + 
                          "<span class=\"hoverTxt\"> click to mark as troll </span>" + 
                          "<span class=\"name\">" + name + ": </span>" + 
                          "<span class=\"msgbody\">" + body + "</span>" +
                          "<div class=\"upvote\">+</div>" + 
                          "<div class=\"votes\">0</div>" + 
                          "</div>"
                         );
        
        this.txt.prop({ scrollTop: this.txt.prop("scrollHeight")});
	    this.txt.emoticonize({});
        
        $(".upvote").click(this.upvoteClicked);
        
        $(".troll").hover(
            function(e) {
                var uid = $(e.currentTarget).parent().children(".hoverTxt").show();
                var uid = $(e.currentTarget).parent().children(".msgbody").hide();
            }, function(e){
                var uid = $(e.currentTarget).parent().children(".hoverTxt").hide();
                var uid = $(e.currentTarget).parent().children(".msgbody").show();
            });
        
	    $(".troll").click(function(e) {
		    var uid = $(e.currentTarget).parent().attr("uid");
		    if (!$(e.currentTarget).hasClass("marked")) {
			    $("[uid~=\"" + uid + "\"]").children(".troll").addClass("marked");
                
			    socket.emit("mark_user", {id: uid});
			    Room.setStatus(uid, "-1");
		    } /* else {
			    $("[uid~=\"" + uid + "\"]").children(".troll").addClass("marked");
			    
			    socket.emit("set_status", {status: "-1", fbid: uid});
			        Room.setStatus(uid, "-1");
		    }
               */
		});
    },
    
    getMsg : function(data) {
	    var uid = data["userID"];
        var _m = data["msg"];
        var msgID = data["msgID"];
        
        if (uid == -1) {
            Chat.serverMsg(_m);
        } else if (!(uid in fbid_names)) {
            getUserName(uid, function(uid2, name) {
		        fbid_names[uid2] = name; 
		        this.addMsg(uid2, name, msgID, _m);
		    });
        } else {
            this.addMsg(uid, fbid_names[uid], msgID, _m);
        }
        return false;
    },
    
    sendMsg : function() {
        var message = $("#msg").val();
        
        if (message.length == 0)
            return false;
        
        // Check to see if user is performing action
        if (message.charAt(0) == "/") {
            var actionString = message.substring(1); 
            var actionEndIndex = actionString.indexOf(" ");
            if (actionEndIndex == -1)
                actionEndIndex = actionString.length;
            var action = actionString.substring(0, actionEndIndex);
            
            var extra = "";
            if (actionEndIndex != -1) {
                extra = actionString.substring(actionEndIndex + 1);
            }
            
            socket.emit("action", {"action": action, "extra": extra}); 
        } else { 
            socket.emit("msg", {"msg": String(message)});           
        }
        
        $("#msg").val("");
        return false;
    }
};

var Room = {
    init : function() {
      socket.on("room_info", this.roomInfo.bind(this));
	    socket.on("part", this.userPart.bind(this));
	    socket.on("join", this.userJoin.bind(this));
        
	    socket.on("update_count", function(data) {
		    var id = data.msgID;
		    $("#msg" + id).children(".votes").text(data.cnt);
	    });
	    
        this.numClients = 0;
	    this.clients = {};
        this.name = "-- no room --";
        $("#roomName").html("<span id=\"rnTitle\"></span> " +
                            "(<a id=\"rnNum\" href=\"#\"></a>)");
        $("#rnNum").click(function () {
            $("#roomInfo").toggle();
            return false;
        });
        $("#roomInfoX a").click(function() {
            $("#roomInfo").hide();
            return false;
        });
        this.updateTitle();
    },

    hasFlock: function(cid, type, fid) {
      socket.emit("has_flock", {"contentID" : cid, "contentType" : type, "flockID" : fid});
     },

    getStatus: function(uid) {
        if (!(uid in this.clients))
            return "0";
        return this.clients[uid].status;
    },
    
    setStatus: function(uid, st) {
        if (!(uid in this.clients))
            return;
        this.clients[uid].status = st;
    },
    
    updateTitle: function() {
        $("#rnTitle").html(this.name);
        $("#rnNum").html(this.numClients + (this.numClients == 1 ? " user" : " users"));
    },

    clearRoom: function(){
      this.clients = {};
      this.numClients = 0;        
      $("#text").html("");
      $("#roomInfoText").html("");
    },
    
    addUser : function(client) {
        var uid = client.uid;
        if (uid in this.clients)
            return;
        this.clients[uid] = client;
        if (!(uid in fbid_names)) {
	        getUserName(uid, function(uid2, name) {
		        fbid_names[uid2] = name; 
                $('#roomInfoText').append("<div id=\"usr"+uid2+"\"><a href=\"http://facebook.com/"+uid2+"\" target=\"_blank\">"+fbid_names[uid2]+"<\a></div>");
            });
	    } else {
            $('#roomInfoText').append("<div id=\"usr"+uid+"\"><a href=\"http://facebook.com/"+uid+"\" target=\"_blank\">"+fbid_names[uid]+"<\a></div>");
        }
        this.numClients++;
        this.updateTitle();
    },
    
    removeUser : function(client) {
        if (!(client.uid in this.clients))
            return;
        delete this.clients[client.uid];
        $("#usr" + client.uid).remove();
        this.numClients--;
        this.updateTitle();
    },
    
    roomInfo : function(data) {
        this.name = data.name;
        if(data.kicked == true){
          showDialog("TROLL! Click to be placed in a new room.", false);
          this.clearRoom();
        }
        // update fid hash in URL
        window.location.href = $.param.fragment( window.location.href, $.param({ fid: data.id }));
        
        for (var i in data.clients) {
            this.addUser(data.clients[i]);
        }
        this.updateTitle();
    },
    
    userJoin : function(data) {
        this.addUser(data);
		if (!(data.uid in fbid_names)) {
            getUserName(data.uid, function(uid, name) {
			    fbid_names[uid] = name; 
			    Chat.serverMsg(fbid_names[uid] + " joined the flock");			
			});
		} else {
		    Chat.serverMsg(fbid_names[data.uid] + " joined the flock");
		}
    },
    
    userPart : function(data) {
        this.removeUser(data);
		Chat.serverMsg(fbid_names[data.uid] + " has left the flock");
    },

    pickContent : function(cid, type) {
        socket.emit("pick_content", {"contentID" : cid, "contentType" : type});
        
        // update cid hash in URL
        window.location.href = $.param.fragment( window.location.href, $.param({ cid: cid }));
        
        $("#side").show();
    },
    
    pickContentWithFid : function(cid, type, fid) {
        socket.emit("pick_content", {"contentID" : cid, "contentType" : type, "flockID" : fid});
        $("#side").show();
    },
    
    removeContent : function() {
        this.clearRoom();
        $("#side").hide();
        this.name = "--no room--";
        socket.emit("remove_content");
    }
};

$(document).ready(function() {
	socket = io.connect();
	socket.on("connect", function() {});
	
    Chat.init();
	Room.init();
    
	//DEBUG
	$("#testLogin").click(function(){
		Chat.loggedIn(0);
	});
});





