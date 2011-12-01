
var globals = {};
globals.contentLimit = 20;
globals.contentOffset = 0;
var isFreeBird = true; // fix for prevent streams from loading on scroll while in a flock

$(document).ready(function() {

    $("#video").hide();
    $("#secondaryVideo").hide();

    var category_query = 'http://api.justin.tv/api/category/list.json?jsonp=?';
    
    $.getJSON(category_query, function(categories) {
        var elSel = $("#selectVideo");
        
        elSel.append($("<option></option>").attr("value",-1).text("Please select a stream category"));
        
        // populate dropdown with categories to choose from
        $.each(categories, function(i,category) {
            elSel.append($("<option></option>").attr("value",i).text(category.name));
        });
    });
    
    var url = document.URL;
    
    var cid = -1;
    var fid = -1;
    
    if(url.lastIndexOf("/") < url.length-2) {
        var obj = $.deparam.fragment(url);

        if (obj["cid"] && obj["fid"]) {
            cid = String(obj["cid"]);
            fid = String(obj["fid"]);
            
            socket.on("has_flock", function(data) {
                finishLoadingPage(data,fid,cid);
            });
            hasFlock(cid, 'justin.tv', fid);
        }
    }
  
   
    $("#selectVideo").change(function() {
	    var agree = false;
	    
	    if(!isFreeBird)
		    agree = confirm("This will remove you from the current flock");
	    
	    if(agree || isFreeBird)
	    {
		    if(agree)
		    {
			    var child = document.getElementById("overlay");
			    var parent = document.getElementById("contentBody");
			    parent.removeChild(child);
                Room.removeContent();
		    }
		    
		    isFreeBird = true;
		    $("#video").hide();		
		    $("#contentList").html(""); // Clear the old content list
		    globals.contentOffset = 0; // Reset the offset
		    getMoreChannels();
	    }
    });

    $("#content").scroll(function() {
        if ($(this)[0].scrollHeight - $(this).scrollTop() <= $(this).outerHeight()) {
            getMoreChannels();
        }
    });
    
    $(window).resize(resizeVideo);
});

function resizeVideo() {
    var children = $("#video").children();
    var cc = children.children();
    if (children && cc) {
        cc.height($("#side").height() * .92);
        cc.width($("#content").width() * .98);
        $("#overlay").width(cc.width());
        $("#overlay").height(cc.height() * .96);
    }
}

function finishLoadingPage(data,fid,cid) {
    displayVideo(cid, true, fid);
    $("#side").show();
    resizeVideo();
}

function getMoreChannels()
{
    var e = document.getElementById("selectVideo");
    var val = e.options[e.selectedIndex].value;
    if (val == -1)
        return;
    var channel_query = 'http://api.justin.tv/api/stream/list.json?jsonp=?';
    var args = { 'category': val , 'language':"en", 'limit': globals.contentLimit, 'offset': globals.contentOffset};
    $.getJSON(channel_query, args, function(channels) { 
        globals.contentOffset += channels.length;
        addChannels(channels);
    });
}

function addChannels(channels)
{
    var contentList = $("#contentList");
    
    $.each(channels, function(j, channel) {
        var name = channel.title;
        if(name != null) {
            var html = 
                    "<div class=\"contentListItem\" onclick=\"displayVideo(\'" + channel.channel.login + "\', "+false + ","+ 0 + ");\">" +
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
                    "<div class=\"contentListItemClear\"></div>" +
                    "</div>";
            contentList.append(html);
        }
    });

    contentList.show();
}

function displayVideo(cid, contentAlreadyCalled, fid)
{
    $("#video").show();
    $("#contentList").hide();
    var videoId = cid;
	
	var html_code = 
         "<div class='dragHandle'></div><div id=\"video" + videoId + "\">"
         + "<object wmode=\"opaque\" type=application/x-shockwave-flash " +
         + "height=\"100%\" width=\"100%\""
         + "data=\"http://www.justin.tv/widgets/jtv_player.swf?channel=" + cid + "\""
         + " bgcolor=\"#000000\">"
         + "<param name=\"allowFullScreen\" value=\"true\" />"
         + "<param name=\"allowscriptaccess\" value=\"always\" />"
         + "<param name=\"movie\" value=\"http://www.justin.tv/widgets/jtv_player.swf\" />"
         + "<param name=\"flashvars\" value=\"channel=" + cid + "\" bgcolor=\"#000000\">"
         + "<param name=\"allowFullScreen\" value=\"true\" />"
         + "<param name=\"allowscriptaccess\" value=\"always\" />"
         + "<param name=\"movie\" value=\"http://www.justin.tv/widgets/jtv_player.swf\" />"
         + "</object>";
    
    var dropdown = document.getElementById("selectVideo");
    
    if(!contentAlreadyCalled) {
        chooseContent(cid, 'justin.tv');
    } else {
        chooseContentWithFid(cid, 'justin.tv', fid);
    };

    $("#contentBody").append($("<div></div>").attr("id","overlay"));
	
    var videoDiv = $("#video");
    videoDiv.html(html_code + "<br/>");
	
    resizeVideo();
    isFreeBird = false;
    dropdown.selectedIndex = 0;
}
