
var express = require("express"),
    stylus  = require("stylus");

var app = express.createServer();

var port = 8000;
if (process.argv.length >= 3)
    port = Number(process.argv[2]);

function compileStylus(str, path) {
    return stylus(str)
        .set('filename', path)
        .set('compress', false);
}

// configure express to serve static files and use jade templating
app.configure(function () {
	app.use(express.static(__dirname + "/public"));
    app.use(stylus.middleware({
        src:  __dirname + "/views",
        dest: __dirname + "/public",
        compile: compileStylus
    }));
	app.set("views", __dirname + "/views");
	app.set("view engine", "jade");
    app.set("view options", {pretty:true});
});

// express stuff
app.get("/", function (req, res) {
	res.render("index", {layout: false});
});

app.listen(port, function () {
	var addr = app.address();
	console.log("Flock listening on " + addr.address + ":" + addr.port);
});

module.exports = app;
