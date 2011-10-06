var socket = 0;
var fbid_names = {};

var Chat = {
    init : function() {
      socket.on("msg", this.getMsg.bind(this));
      $("#send").submit(this.sendMsg.bind(this));
      Chat.uid = 0;
    },

    loggedIn : function(info) {
        console.log(info);
        data['userID'] = info['uid'];
        $("#login").hide();
        $("#chat").show();
    },
    
    getMsg : function(data) {
      var uid = data["userID"];
      var m = data["msg"];
      var name = "Unknown";
      if (!(uid in names)) {
        fbid_names[uid] = getUserName(uid);
      }

      $("#text").append(
          "<b>" + fbid_names[uid] + "</b>: " + m + "<br />");
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
      socket.on("room_info", function(data) { that.updateRoomInfo(data); });
      this.pickContent(1, "Test");
    },

    updateRoomInfo : function(data) {
      $("#roomName").innerHTML = data.name;
    },

    pickContent : function(cid, type) {
      socket.emit("login", {"userID": Chat.uid});
      socket.emit("pick_content", {"contentID" : cid, "contentType" : type});
    }
};

$(document).ready(
  function() {
    socket = io.connect();
    socket.on("connect", function() {});
    Chat.init();
    Room.init();
  }
);


function chooseContent(cid, type) {
  Room.pickContent(cid, type);
}
