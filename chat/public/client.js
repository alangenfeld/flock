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
        $("#login").hide();
        $("#chat").show();
    },
    
    getMsg : function(data) {
        var add = function(name, m) {
            console.log("put " + name + m);
            $("#text").append("<b>" + name + "</b>: " + m + "<br />");
            $("#text").prop({ scrollTop: $("#text").prop("scrollHeight")});
            $("#text").emoticonize({});
        };

        var uid = data["userID"];
        var _m = data["msg"];

        if (uid == -1) {
            add("**Server**", _m);
        } else if (!(uid in fbid_names)) {
            getUserName(uid, function(name) {
                fbid_names[uid] = name; 
                add(name, _m);
            });
        } else {
            add(fbid_names[uid], _m);
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
    }
};

$(document).ready(
    function() {
        socket = io.connect();
        socket.on("connect", function() {});
        Chat.init();
        Room.init();

        //DEBUG
        $("#testLogin").click(function(){
	  	    Chat.loggedIn(0);
            Room.pickContent(1, "Test");
	    });
    }
);


function chooseContent(cid, type) {
    Room.pickContent(cid, type);
}
