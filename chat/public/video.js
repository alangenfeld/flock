var globals = {};
globals.contentLimit = 20;
globals.contentOffset = 0;
isFreeBird = true; // fix for prevent streams from loading on scroll while in a flock

$(document).ready(function()
{
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
/*    var children = $("#video").children();
    if (children && children.children()) {
        children.children().height($("#side").height()*0.6);
        children.children().width($("#content").width()*0.98);
    }
    
    children = $("#secondaryVideo").children();
    if (children && children.children()) {
        children.children().height($("#side").height()*0.2);
        children.children().width($("#content").width()*0.31);
    }
*/
};

$("#selectVideo").change(function()
{

    $("#contentList").html(""); // Clear the old content list
    globals.contentOffset = 0; // Reset the offset
    getMoreChannels();

});

function getMoreChannels(freeBird)
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
        getMoreChannels(isFreeBird);
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
        "<div class=\"contentListItemClear\"></div>"
        "</div>";
      contentList.append(html);
    }
  });

  contentList.show();
}

function displayVideo(login, title)
{
    $("#contentList").hide();
    var videoClass = "floatDiv";
    var videoId = login;
    var dragHandleClass = "dragHandle";
    if(!isFreeBird)
    {
        videoClass = "sFloatDiv";
        dragHandleClass = "secondaryDragHandle";
        videoId = videoId + "_secondary";
    }   
    
    var html_code = 
            "<div class='" + dragHandleClass + "'></div><div class='" + videoClass + "' id='" + videoId + "'>"
            + "<object type=application/x-shockwave-flash height=100% width=100% data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + login + " bgcolor=#000000>"
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
    
    if(isFreeBird)
    {
        chooseContent(login, 'justin.tv');
        dropdown.options[0] = new Option("Click to add a secondary stream", "-1");
        var videoDiv = $("#video");
        videoDiv.html(html_code + "<br/>");
        
        var leave_button = "<img id='leave' src='leaving.jpg' onClick='window.location.reload()' title='Click to leave flock.'/>";
        $("#categorySelect").append(leave_button);
        
        isFreeBird = false;    
        
        var dragHandle = $("div.dragHandle", videoDiv);
        videoDiv.draggable({ handle: dragHandle });
        videoDiv.resizable();

    }
    else  
    {
        var secondaryVideoDiv = $("#secondaryVideo");
        secondaryVideoDiv.append(html_code + leave_html);
        var dragHandle = $("div.dragHandle", secondaryVideoDiv);
        secondaryVideoDiv.draggable({ handle: dragHandle });
        secondaryVideoDiv.resizable();
    }
    
    dropdown.selectedIndex = 0;
}

function removeStream(streamID)
{
//   removeContent();
   var d = document.getElementById("secondaryVideo");
   var olddiv = document.getElementById(streamID);
    d.removeChild(olddiv);
}
