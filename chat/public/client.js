
var socket = 0;
var nick   = "NoNameJoe";

$(document).ready(function() {
	$("#setnick").submit(function() {
		nick = $("#nick").val();
		$("#setnick").hide();
		$("#chat").show();
		socket = io.connect();
		
		socket.on("connect", function() {

		});

		socket.on("msg", function(data) {
			var n = data["nick"];
			var m = data["msg"];
			$("#text").append("<b>" + n + "</b>: " + m + "<br />");
		});
		
		$("#send").submit(function () {
			socket.emit("msg", {"nick":nick, "msg": $("#msg").val()});
			$("#msg").val("");
			return false;
		});
		return false;
	});
});