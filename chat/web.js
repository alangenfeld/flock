
var express = require("express");

var app = express.createServer();

// configure express to serve static files and use jade tempalting
app.configure(function () {
	app.use(express.static(__dirname + "/public"));
	app.set("views", __dirname);
	app.set("view engine", "jade");
});

// express stuff
app.get("/", function (req, res) {
	res.render("index", {layout: false});
});

app.listen(3000, function () {
	var addr = app.address();
	console.log("  app listening on " + addr.address + ":" + addr.port);
});

module.exports = app
