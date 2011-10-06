var socket = 0;
var fbid_names = {};

var Chat = {
    init : function() {
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
      var name = "Unknown";
      if (!(uid in names)) {
        fbid_names[uid] = uid;//  lookupName(uid);
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

function Content()
{
    this.contentID = 0;
    this.contentType = 0;
    
    // content types should implement this method.  We should talk about this
    // API
    function render() {

    }
};

var Room = {
    init : function() {
      var that = this;
      socket.on("room_info", function(data) { that.updateRoomInfo(data); });
    },

    updateRoomInfo : function(data) {
      $("#roomName").innerHTML = data.name;
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
  }
);


function chooseContent(cid, type) {
  Room.pickContent(cid, type);
}
