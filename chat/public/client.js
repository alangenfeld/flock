var socket = 0;
var fbid_names = {};

var Chat = {
    init : function() {
        socket.on("msg", this.getMsg.bind(this));
        $("#send").submit(this.sendMsg.bind(this));
        this.uid = 0;
    },
    
    loggedIn : function(uid) {
        socket.emit("login", {"userID":uid});
        this.uid = uid;
        $("#landing").hide();
        $("#side").hide();
        $("#container").show();
    },
    
    serverMsg : function(msg) {
        $("#text").append("<div class=\"message\">" +
			              "<b>Server:</b> " + msg + "<br />" + 
			              "</div>"
			             );
	    
        $("#text").prop({ scrollTop: $("#text").prop("scrollHeight")});
    },
    
    getMsg : function(data) {
        var add = function(id, name, m, msgID) {
	        var status = Room.getStatus(id);
            var troll;
	        switch (status) {
	        case "-1":
		        troll = "<div class=\"marked troll\"></div>";
		        break;
	        default:
		        troll = "<div class=\"troll\"></div>";
		        break;
	        }
	        
	        $("#text").append("<div class=\"message\" id=\"msg" + msgID + "\" " + 
			                  "uid=\"" + id + "\">" +
			                  troll + 
			                  "<span class=\"name\">" + 
			      " <b>" + name + ":</b> " + m + 
			                  "</span>" +
			                  "<div class=\"upvote\">+</div>" + 
			                  "<div class=\"votes\">0</div>" + 
			                  "</div>"
			                 );
	        
            $("#text").prop({ scrollTop: $("#text").prop("scrollHeight")});
	        $("#text").emoticonize({});
	        
	        $(".name").click(function(e) {
		        $(e.currentTarget).parent().children(".troll").toggle();
		    });

	        $(".upvote").click(function(e){
		        var mid = $(e.currentTarget).parent().attr("id");
		        if ($(e.currentTarget).hasClass("selected")) {
			        //socket.emit("rm_edge", {id: mid});
		        } else {
			        socket.emit("msg_vote", {id: mid, change: 1});
		        }
                
		        $(e.currentTarget).toggleClass("selected");
		    });
            
	        $(".troll").click(function(e) {
		        var uid = $(e.currentTarget).parent().attr("uid");
		        if ($(e.currentTarget).hasClass("marked")) {
			        $("[uid~=\"" + uid + "\"]").children(".troll").removeClass("marked");
                    
			        socket.emit("set_status", {status: "0", fbid: uid});
			        Room.setStatus(uid, "0");
		        } else {
			        $("[uid~=\"" + uid + "\"]").children(".troll").addClass("marked");
			        
			        socket.emit("set_status", {status: "-1", fbid: uid});
			Room.setStatus(uid, "-1");
		        }
		    });
        };
	    
	    var uid = data["userID"];
        var _m = data["msg"];
        var msgID = data["msgID"];
        
        if (uid == -1) {
            Chat.serverMsg(_m);
        } else if (!(uid in fbid_names)) {
            getUserName(uid, function(uid2, name) {
		        fbid_names[uid2] = name; 
		        add(uid2, name, _m, msgID);
		    });
        } else {
            add(uid, fbid_names[uid], _m, msgID);
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
            socket.emit("msg", {"msg": message});           
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
	
        $("#roomName").text("-- no room --");
	    this.clients = {};
    },
    
    roomInfo : function(data) {
        console.log("updateroominfo", data);
        $("#roomName").text(data.name);
        
        // update fid hash in URl
        window.location.href = $.param.fragment( window.location.href, $.param({ fid: data.id }));
        
        var that = this;
        for (var i in data.clients) {
	        console.log("got ur for "+data.clients[i].uid);
		    that.clients.push(data.clients[i].uid);
		    that.clients[that.clients.length-1].status = data.clients[i].status;
            addUserToRoom(data.clients[i].uid, data.clients[i].status);
        }
    },
    
    userJoin : function(data) {
		this.clients.push(data);
        this.clients[this.clients.length - 1].status = data.status;
		if (!(data.uid in fbid_names)) {
            getUserName(data.uid, function(uid, name) {
			    fbid_names[uid] = name; 
			    Chat.serverMsg(fbid_names[uid] + " joined the flock");			
		        addUserToRoom(uid);
			});
		} else {
		    Chat.serverMsg(fbid_names[data.uid] + " joined the flock");
		    addUserToRoom(data.uid);
		}	    
    },
    
    userPart : function(data) {
		for (var i=0; i < this.clients.length; i++) {
		    if (this.clients[i].uid == data.uid) {
			    this.clients.splice(i, 1);
		    }
		}
        var parent = document.getElementById("roomInfo");
        var child = document.getElementById(data.uid);
        parent.removeChild(child);
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
        socket.emit("remove_content");
    },

    getClients: function() {
        return this.clients;
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
	$('#side').tabs();
});

function addUserToRoom(uid){
    if (!(uid in fbid_names)) {
	    getUserName(uid, function(uid2, name) {
		    fbid_names[uid2] = name; 
            $('#roomInfo').append("<div id="+uid2+"><a href=\"http://facebook.com/"+uid2+"\" target=\"_blank\">"+fbid_names[uid2]+"<\a></div>");
        });
	} else {
        $('#roomInfo').append("<div id="+uid+"><a href=\"http://facebook.com/"+uid+"\" target=\"_blank\">"+fbid_names[uid]+"<\a></div>");
    }
}

function chooseContent(cid, type) {
    Room.pickContent(cid, type);
}

function chooseContentWithFid(cid, type, fid) {
    Room.pickContentWithFid(cid, type, fid);
}



