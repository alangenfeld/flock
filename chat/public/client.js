var socket = 0;
var user = new User();

var Chat =
{
    init : function() 
    {
 	socket.on("msg", this.getMsg.bind(this));
	$("#send").submit(this.sendMsg.bind(this));
    },

    loggedIn : function(info) {
        console.log(info);
        $("#login").hide();
        $("#chat").show();
    },
    
    getMsg : function(data) {
	var uid = data["userID"];
	var m = data["msg"];
	// TODO: get facebook info for uid
	$("#text").append(
	    "<b>" + uid + "</b>: " + m + "<br />");
	return false;
    },

    sendMsg : function() {
	socket.emit("msg", {"msg": $("#msg").val()});
	$("#msg").val("");
	return false;
    },
};

function User()
{
    this.fbid = 0;
    // Additional flock-related user data
};

function Room() 
{
    // Room info
};

function Content()
{
    this.contentID = 0;
    this.contentType = 0;
    
    // content types should implement this method.  We should talk about this
    // API
    function render() {

    }
};

JTVStream.prototype = new Content();

function JTVStream() {
    function render() {
	// render JTVStream
    }
}

var Flock = 
{
    init : function() 
    {
 	var that = this;
 	socket.on("room_info", this.updateRoomInfo.bind(this));
    },

    updateRoomInfo : function(data) {
	// Update UI with room info
    },

    pickContent : function(content) {
	socket.emit("pick_content", {"contentID" : content.contentID, "contentType" : content.contentType});
	// Render room info; content.render();
    }

    
};

$(document).ready(
    function() {
	socket = io.connect();
	socket.on("connect", 
		  function() {
		      
		  });
	Chat.init();
    }
);
