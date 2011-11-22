var globals = {};
globals.contentLimit = 20;
globals.contentOffset = 0;
isFreeBird = true; // fix for prevent streams from loading on scroll while in a flock

$(document).ready(function()
{
    $("#video").hide();
    $("#secondaryVideo").hide();
   var category_query = 'http://api.justin.tv/api/category/list.json?jsonp=?';
   $.getJSON(category_query, function(categories)
   {
      var elSel = $("#selectVideo");

      elSel.append($("<option></option>").attr("value",-1).text("Please select a stream category"));

      // populate dropdown with categories to choose from
      $.each(categories, function(i,category)
      {
        elSel.append($("<option></option>").attr("value",i).text(category.name));
      });
   });
});

window.onresize = function() {
    var children = $("#video").children();
    if (children && children.children()) {
        children.children().height($("#side").height() * .96);
        children.children().width($("#content").width() * .98);
    }
}

$("#selectVideo").change(function()
{
	/*
    if(!isFreeBird)
		$("#contentList").html("").css({"top": $("#video").height() + 30 + "px" }); // Clear the old content list
	*/
	
	var agree;
	
	if(!isFreeBird)
	{
		agree = confirm("This will remove you from the current flock");
	}
	
	if(agree || isFreeBird)
	{
		if(agree)
		{
			var child = document.getElementById("overlay");
			var parent = document.getElementById("contentBody");
			parent.removeChild(child);
		}
		
		isFreeBird = true;
		$("#video").hide();		
		$("#contentList").html(""); // Clear the old content list
		globals.contentOffset = 0; // Reset the offset
		getMoreChannels();
	}
	
});

function getMoreChannels()
{
    var e = document.getElementById("selectVideo");
    var val = e.options[e.selectedIndex].value;
    if (val == -1) return;
    var channel_query = 'http://api.justin.tv/api/stream/list.json?jsonp=?';
    var args = { 'category': val , 'language':"en", 'limit': globals.contentLimit, 'offset': globals.contentOffset};
    $.getJSON(channel_query, args, function(channels)
    { 
      globals.contentOffset += channels.length;
      addChannels(channels);
    });
}

$("#content").scroll(function() {
    if ($(this)[0].scrollHeight - $(this).scrollTop() <= $(this).outerHeight()) {
        getMoreChannels();
    }
});

function addChannels(channels)
{
  var contentList = $("#contentList");

  $.each(channels, function(j, channel)
  {
    var name = channel.title;
    if(name != null ){
      var html = 
        "<div class=\"contentListItem\" onclick=\"displayVideo(\'" + channel.channel.login + "\', \'" + channel.title + "\');\">" +
        "<div class=\"contentViewers\">" +
          "<div class=\"contentViewersCount\">" + channel.channel_count + "</div>" +
          "<div class=\"contentViewersLabel\">people</div>" +
        "</div>" +
        "<div class=\"contentInformation\">" +
          "<span class=\"contentTitle\">" + channel.title + "</span>" +
          "<span class=\"contentCategory\">" + channel.channel.category_title + "</span>" + 
        "</div>" +
        "<div class=\"createRoom\">" +
          "<button id=\"createRoomButton\" type=\"button\">Create New Flock</button>" +
        "</div>" +
        "<div class=\"contentListItemClear\"></div>"
        "</div>";
      contentList.append(html);
    }
  });

  contentList.show();
}

function displayVideo(login, title)
{
    $("#video").show();
    $("#contentList").hide();
    var videoClass = "floatDiv";
    var videoId = login;
	/*
    if(!isFreeBird)
    {
        videoId = videoId + "_secondary";
    }   
    */
	
    var html_code = 
            "<div class='dragHandle'></div><div class='" + videoClass + "' id='" + videoId + "'>"
            + "<object wmode=transparent type=application/x-shockwave-flash height=100% width=100% data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + login + " bgcolor=#000000>"
            + "<param name=allowFullScreen value=true />"
            + "<param name=allowscriptaccess value=always />"
            + "<param name=movie value=http://www.justin.tv/widgets/jtv_player.swf />"
            + "<param name=flashvars value=channel=" + login + " bgcolor=#000000>"
            + "<param name=allowFullScreen value=true />"
            + "<param name=allowscriptaccess value=always />"
            + "<param name=movie value=http://www.justin.tv/widgets/jtv_player.swf />"
            + "</object>";
    var leave_html =
            "<br/>"
            + "<center><p>"
               + "<b>Title:</b> " + title.substring(0,35) + "<br/>"
               + "<a onmouseout=this.style.textDecoration='none' onmouseover=this.style.textDecoration='underline';this.style.cursor='pointer' onclick=removeStream('" + videoId + "')>Click to Remove Stream</a>"
            + "</p></center>"
            + "</div>";
    
    var dropdown = document.getElementById("selectVideo");
    /*
    if(isFreeBird)
    {
	 */
        chooseContent(login, 'justin.tv');
        //dropdown.options[0] = new Option("Click to add a secondary stream", "-1");

    $("#contentBody").append($("<div></div>").attr("id","overlay"));
	
    var videoDiv = $("#video");
    var overlayDiv = $("#overlay");
    videoDiv.html(html_code + "<br/>");
	
	var children = $("#video").children();
    if (children && children.children()) {
        children.children().height($("#side").height() * .96);
        children.children().width($("#content").width() * .98);
	}
    
    //var leave_button = "<img id='leave' src='leaving.jpg' onClick='window.location.reload()' title='Click to leave flock.'/>";
    //$("#categorySelect").append(leave_button);
        
    isFreeBird = false;    
 /*       
        var dragHandle = $("div.dragHandle", overlayDiv);
        overlayDiv.draggable({ handle: dragHandle, snap: true, containment: "#contentBody",
		    drag: function() 
		    {
			var e = $("#overlay");
			var p = e.position();
			$("#video").css({ "left": (p.left) + "px", 
				    "top": (p.top) + "px"
				    })

		    }
	    });
        videoDiv.resizable({containment: "#contentBody",
		    resize: function(event, ui)
		    {
			var e = $("#video");
			var p = e.position();
			$("#overlay").css({ "left": (p.left) + "px", 
				    "top": (p.top) + "px",
				    "height": e.height() - 25,
				    "width": e.width()
				    });
		    }
	    });
  */
/*
    }
    else  
    {
	$("#secondaryVideo").show();
        var secondaryVideoDiv = $("#secondaryVideo");
        secondaryVideoDiv.append(html_code + leave_html).css({"top": $("#video").height() + "px" });;
        var dragHandle = $("div.dragHandle", secondaryVideoDiv);
        secondaryVideoDiv.draggable({ handle: dragHandle, snap: true, containment: "#contentBody", stack: ".ui-draggable" });
        secondaryVideoDiv.resizable({ containment: "#contentBody" });
    }
 */  
    dropdown.selectedIndex = 0;
}

/*
function removeStream(streamID)
{
//   removeContent();
   var d = document.getElementById("secondaryVideo");
   var olddiv = document.getElementById(streamID);
    d.removeChild(olddiv);
}
*/
