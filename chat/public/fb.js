var token;
 
window.fbAsyncInit = function() {
	FB.init({appId: '235795953137510', status: true, cookie: true, xfbml: true}); //need to register app to http://ec2-107-20-121-60.compute-1.amazonaws.com/

	/* All the events registered */
	FB.Event.subscribe('auth.login', function(response) {
	    // do something with response
        token = response.authResponse.accessToken;
        Chat.loggedIn(response.authResponse.userID);
	});
	FB.Event.subscribe('auth.logout', function(response) {
	    // do something with response
	});

	FB.getLoginStatus(function(response) {
	    if (response.authResponse) {
		// logged in and connected user, someone you know
            token = response.authResponse.accessToken;
            Chat.loggedIn(response.authResponse.userID);
	    }
	});
};

(function() {
	var e = document.createElement('script');
	e.type = 'text/javascript';
	e.src = document.location.protocol +
	    '//connect.facebook.net/en_US/all.js';
	e.async = true;
	document.getElementById('fb-root').appendChild(e);
}());


function getUserInfo(cb){
	$.getJSON('https://graph.facebook.com/me/?access_token='+token+'&callback=?', function(json){
		user_info = new Object();
		user_info.name = json.name;
		user_info.hometown = json.hometown;
		user_info.location = json.location;
		cb(user_info);
	});
}

function getFriends(cb){
	$.getJSON('https://graph.facebook.com/me/friends?access_token='+token+'&callback=?', function(json){
		user_info = new Object();
		user_info.friends = json["data"];
		cb(user_info);
	});
}

function getUserName(id, cb){
  if(id == 0){
    cb("test");
  } else {
    FB.api("/" + id, function(response) {
	    var name = response.name;
	    name = name.slice(0, name.indexOf(" ")+2);
	    cb(id, name);
	});      
  }
}
