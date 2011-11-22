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
	/**
	   getFriends(function(info) {
	   var fbids = new Array();
	   for (var i in info.friends) {
	   fbids.push(info.friends[i].id);
	   }
	   socket.emit("add_friends", {"friends": fbids}); 
	   });
	*/
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
	    
	    $("#text").append("<div class=\"message\" id=\"" + msgID + "\" " + 
			      "uid=\"" + id + "\">" +
			      troll + 
			      "<span class=\"name\">" + 
			      " <b>" + name + ":</b> " + m + 
			      "</span>" +
			      "<div class=\"upvote\">+</div>" + 
			      "<div class=\"votes\">?</div>" + 
			      "</div>"
			      );
	    
            $("#text").prop({ scrollTop: $("#text").prop("scrollHeight")});
	    $("#text").emoticonize({});
	    
	    $(".name").click(function(e) {
		    $(e.currentTarget).parent().children(".troll").toggle();
		});

	    socket.emit("get_inc", {id: msgID});

	    $(".upvote").click(function(e){
		    var mid = $(e.currentTarget).parent().attr("id");
		    if ($(e.currentTarget).hasClass("selected")) {
			socket.emit("rm_edge", {id: mid});
			socket.emit("get_inc", {id: mid});
		    } else {
			socket.emit("set_edge", {id: mid});
			socket.emit("get_inc", {id: mid});
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
            getUserName(uid, function(name) {
		    fbid_names[uid] = name; 
		    add(uid, name, _m, msgID);
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
        var that = this;
        socket.on("room_info", function(data) { 
		that.updateRoomInfo(data);
	    });
	socket.on("part", function(data) {
		for (var i=0; i<that.dudes.length; i++) {
		    if (that.dudes[i].uid == data.uid) {
			that.dudes.splice(i, 1);
		    }
		}
		$('#roomInfo').text("there are "+that.dudes.length+" in here");
		Chat.serverMsg(fbid_names[data.uid] + " has left the flock");});

	socket.on("join", function(data) {
		that.dudes.push(data);
		$('#roomInfo').text("there are "+that.dudes.length+" in here");
		if (!(data.uid in fbid_names)) {
		    getUserName(data.uid, function(name) {
			    fbid_names[data.uid] = name; 
			    Chat.serverMsg(fbid_names[data.uid] + " joined the flock");			
			});
		} else {
		    Chat.serverMsg(fbid_names[data.uid] + " joined the flock");}
	    });

	socket.on("update_count", function(data) {
		console.log("update", data);
		var id = data.msgID;
		$("#" + id).children(".votes").text(data.cnt);
	    });
	
        $("#roomName").text("-- no room --");
	that.dudes = Array();
    },
	
    getStatus : function(uid) {
	for (var i in this.dudes) {
	    if (uid == this.dudes[i].uid) {
		return this.dudes[i].status;
	    }
	}
	return 0;
    }, 

    setStatus : function(uid, stat) {
	for (var i in this.dudes) {
	    if (uid == this.dudes[i].uid) {
		this.dudes[i].status = stat;
	    }
	}
    }, 
	
    updateRoomInfo : function(data) {
	console.log(data);
        $("#roomName").text(data.room_name);
  this.dudes = Array();
	for (var i in data.room_dudes) {
	    for (var j in this.dudes) {
		if (data.room_dudes[i] == this.dudes[j].uid) {
		    this.dudes[j].status = data.room_dudes[i].status;
		    break;
		}
	    }
	    this.dudes.push(data.room_dudes[i]);
	}

		$('#roomInfo').text("there are "+this.dudes.length+" in here");
    },

    pickContent : function(cid, type) {
        socket.emit("pick_content", {"contentID" : cid, "contentType" : type});
        $("#side").show();
    },

    removeContent : function() {
        socket.emit("remove_content");
    }
};

$(document).ready(
		  function() {
		      socket = io.connect();
		      socket.on("connect", function() {});
		      Chat.init();
		      Room.init();

		      socket.on("updateUsersInChat", function(users){

			  });

		      //DEBUG
		      $("#testLogin").click(function(){
			      Chat.loggedIn(0);
			  });
			  $('#side').tabs();
		  }
		  );

function getUsersInRoom(){
}

function chooseContent(cid, type) {
    Room.pickContent(cid, type);
}

function removeContent() {
    Room.removeContent();
}

function temp() {
    $(".up.vote").click(function(e) {
	    var uid = $(e.currentTarget).parent().attr("uid");
	    if ($(e.currentTarget).hasClass("selected")) {
			
		$("[uid~=\"" + uid + "\"]").children(".up").removeClass("selected");

		socket.emit("set_status", {status: 0, fbid: uid});
		Room.setStatus(uid, "0");
	    } else {

		$("[uid~=\"" + uid + "\"]").children(".up").addClass("selected");

		if ($(e.currentTarget).parent().children(".down")
		    .hasClass("selected")) {
				
		    $("[uid~=\"" + uid + "\"]").children(".down").
			removeClass("selected");
		}
		socket.emit("set_status", {status: "1", fbid: uid});
		Room.setStatus(uid, "1");
	    }
	});

}
