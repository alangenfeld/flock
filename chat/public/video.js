$(document).ready(function()
{
   var category_query = 'http://api.justin.tv/api/category/list.json?jsonp=?';
   $.getJSON(category_query, function(categories)
   {
       var elSel = document.getElementById('selectVideo');
      // populate dropdown with categories to choose from
      $.each(categories, function(i,category)
      {
        var elOptNew = document.createElement('option');
        elOptNew.text = category.name;
        elOptNew.value = i;
        var elOptOld = elSel.options[elSel.selectedIndex];  
        try {
            elSel.add(elOptNew, elSel.length);// standards compliant; doesn't work in IE
        }
        catch(ex) {
            elSel.add(elOptNew, elSel.selectedIndex); // IE only
        }
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
    document.getElementById("video").innerHTML = "";
    var e = document.getElementById("selectVideo");
    var val = e.options[e.selectedIndex].value;
    var channel_query = 'http://api.justin.tv/api/stream/list.json?jsonp=?';
    var args = { 'category': val };
    $.getJSON(channel_query, args, function(channels)
    {
//        listChannels(channels);
        $.each(channels, function(j, channel)
        {
            if(channel.title)
                {
                    var elOptNew = document.createElement('a');
                    elOptNew.id = channel.channel.login
                    elOptNew.className = 'clickable';
                    elOptNew.onclick = Function("displayVideo('"+elOptNew.id+"', '"+channel.title+"')");
                    var elText = document.createTextNode(channel.title);
                    elOptNew.appendChild(elText);
                    $("#video").append(elOptNew);
                    $("#video").append("<br/>");
                }
        });
    });
});

function displayVideo(login, title)
{
    var html_code = "<div class='floatDiv' id='" + login + "'><object type=application/x-shockwave-flash height=295 width=353 data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + login + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /><param name=flashvars value=channel=" + login + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /></object><br/><center><p><b>Title:</b> " + title.substring(0,35) + "<br/><a onmouseout=this.style.textDecoration='none' onmouseover=this.style.textDecoration='underline';this.style.cursor='pointer' onclick=removeStream('" + login + "')>Click to Remove Stream</a></center></p></div>";
    chooseContent(login, 'justin.tv');
    document.getElementById("video").innerHTML = html_code;
}

function removeStream(streamID)
{
   var d = document.getElementById("video");
   var olddiv = document.getElementById(streamID);
   d.removeChild(olddiv);
}