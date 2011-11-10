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
    
    getMsg : function(data) {
        var add = function(id, name, m) {
            $("#text").append("<div class=\"message\" uid=\"" + id + "\">" +
							  "<div class=\"up vote\"></div>" + 
							  "<div class=\"down vote\"></div>" + 
							  "<b>" + name + ":</b> " + m + "<br />" + 
							  "</div>"
							 );

            $("#text").prop({ scrollTop: $("#text").prop("scrollHeight")});
            $("#text").emoticonize({});


			$(".up.vote").click(function(e) {
				var uid = $(e.currentTarget).parent().attr("uid");
				if ($(e.currentTarget).hasClass("selected")) {
				
					$("[uid~=\"" + uid + "\"]").children(".up").removeClass("selected");

					socket.emit("set_status", {status: 0, fbid: uid});
				} else {

					$("[uid~=\"" + uid + "\"]").children(".up").addClass("selected");

					if ($(e.currentTarget).parent().children(".down")
						.hasClass("selected")) {
						
						$("[uid~=\"" + uid + "\"]").children(".down").
							removeClass("selected");
					}
					socket.emit("set_status", {status: "1", fbid: uid});

				}
			});

			$(".down.vote").click(function(e) {
				var uid = $(e.currentTarget).parent().attr("uid");
				if ($(e.currentTarget).hasClass("selected")) {
					$("[uid~=\"" + uid + "\"]").children(".down").removeClass("selected");
					socket.emit("set_status", {status: "0", fbid: uid});
				} else {
					$("[uid~=\"" + uid + "\"]").children(".down").addClass("selected");

					if ($(e.currentTarget).parent().children(".up")
						.hasClass("selected")) {

						$("[uid~=\"" + uid + "\"]").children(".up").
							removeClass("selected");
					}					
					socket.emit("set_status", {status: "-1", fbid: uid});
				}

			});
        };

        var uid = data["userID"];
        var _m = data["msg"];

        if (uid == -1) {
            add("**Server**", _m);
        } else if (!(uid in fbid_names)) {
            getUserName(uid, function(name) {
                fbid_names[uid] = name; 
                add(uid, name, _m);
            });
        } else {
            add(uid, fbid_names[uid], _m);
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
        $("#roomName").text("-- no room --");
    },

    updateRoomInfo : function(data) {
        $("#roomName").text(data.room_name);
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
