
 
window.fbAsyncInit = function() {
	FB.init({appId: '235795953137510', status: true, cookie: true, xfbml: true}); //need to register app to http://ec2-107-20-121-60.compute-1.amazonaws.com/

	/* All the events registered */
	FB.Event.subscribe('auth.login', function(response) {
	    // do something with response
	alert(response.session.access_token);
		Chat.loggedIn(getUserInfo(response.session.access_token));
	});
	FB.Event.subscribe('auth.logout', function(response) {
	    // do something with response
	});

	FB.getLoginStatus(function(response) {
	    if (response.session) {
		// logged in and connected user, someone you know
            Chat.loggedIn();
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


function getUserInfo(token){
	alert("hello"+token);
	return $.getJSON('https://graph.facebook.com/me/?access_token='+token+'&callback=?', function(json){
		user_info = new Object();
		user_info.name = json.name;
		user_info.hometown = json.hometown;
		user_info.location = json.location;
		alert(user_info.hometown);
		return user_info;
	});
}

function getFriends(token){

	return $.getJSON('https://graph.facebook.com/me/friends?access_token='+token+'&callback=?', function(json){
		user_info = new Object();
		user_info.friends = json["data"];
		alert(user_info.friends[0].name);
		return user_info;
	});
}

