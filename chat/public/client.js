var socket = 0;
var fbid_names = {};

var Chat = {
    init : function() {
      socket.on("msg", this.getMsg.bind(this));
      $("#send").submit(this.sendMsg.bind(this));
      Chat.uid = 0;
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
        $("#text").animate({ scrollTop: $("#text").prop("scrollHeight")});
      };

      var uid = data["userID"];
      var _m = data["msg"];
      console.log(_m);
      if (!(uid in fbid_names)) {
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
      socket.emit("msg", {"msg": $("#msg").val()});
      $("#msg").val("");
      return false;
    },
};

var Room = {
    init : function() {
      var that = this;
      socket.on("room_info", function(data) { 
          that.updateRoomInfo(data);
      });
      this.pickContent(1, "Test");
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
	});
  }
);


function chooseContent(cid, type) {
  Room.pickContent(cid, type);
}
