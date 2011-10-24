var globals = {};
globals.contentLimit = 20;
globals.contentOffset = 0;

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
    var children = $("#video").children();
    if (children && children.children()) {
        children.children().height($("#side").height()*0.8);
        children.children().width($("#content").width());
    }
};

$("#selectVideo").change(function()
{
    $("#video").html(""); // Clear the old video stream
    $("#contentList").html(""); // Clear the old content list
    globals.contentOffset = 0; // Reset the offset
    getMoreChannels();
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
    //var name = "";
    var name = channel.title;
    if(name != null && name.match("undefined") == null){// != "undefined" ){
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
    var html_code = "<div class='floatDiv' id='" + login + "'><object type=application/x-shockwave-flash height=295 width=353 data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + login + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /><param name=flashvars value=channel=" + login + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /></object><br/><center><p><b>Title:</b> " + title.substring(0,35) + "<br/><a onmouseout=this.style.textDecoration='none' onmouseover=this.style.textDecoration='underline';this.style.cursor='pointer' onclick=removeStream('" + login + "')>Click to Remove Stream</a></center></p></div>";
    chooseContent(login, 'justin.tv');
    document.getElementById("video").innerHTML = html_code;
    
    var children = $("#video").children();
    if (children && children.children()) {
        children.children().height($("#side").height()*0.8);
        children.children().width($("#content").width());
    }
}

function removeStream(streamID)
{
   removeContent();
   var d = document.getElementById("video");
   var olddiv = document.getElementById(streamID);
   d.removeChild(olddiv);
}
