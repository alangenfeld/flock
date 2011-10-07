$(document).ready(function()
{
   var category_query = 'http://api.justin.tv/api/category/list.json?jsonp=?';
   $.getJSON(category_query, function(categories)
   {
//    $.each(categories, function(i,category)
//    {
         var channel_query = 'http://api.justin.tv/api/stream/list.json?jsonp=?';
         args = { 'category': 'sports' };
         $.getJSON(channel_query, args, function(channels)
         {
            var elSel = document.getElementById('selectVideo');
            $.each(channels, function(j, channel)
            {
               var elOptNew = document.createElement('option');
               elOptNew.text = channel.title;
               elOptNew.value = channel.channel.login;
               var elOptOld = elSel.options[elSel.selectedIndex];  
               try {
                  elSel.add(elOptNew, elSel.length);// standards compliant; doesn't work in IE
               }
               catch(ex) {
                  elSel.add(elOptNew, elSel.selectedIndex); // IE only
               }
            });
         });
//    });
   });
});

$("#selectVideo").change(function()
{
  var e = document.getElementById("selectVideo");
  var val = e.options[e.selectedIndex].value;
  var title = e.options[e.selectedIndex].text;
  var html_code = "<div class='floatDiv' id='" + val + "'><object type=application/x-shockwave-flash height=295 width=353 data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + val + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /><param name=flashvars value=channel=" + val + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /></object><br/><center><p><b>Title:</b> " + title.substring(0,15) + "<br/><a onmouseout=this.style.textDecoration='none' onmouseover=this.style.textDecoration='underline';this.style.cursor='pointer' onclick=removeStream('" + val + "')>Click to Remove Stream</a></center></p></div>";
   chooseContent(val, 'justin.tv');
  $("#video").append(html_code);
});

function removeStream(streamID)
{
   var d = document.getElementById("video");
   var olddiv = document.getElementById(streamID);
   d.removeChild(olddiv);
}