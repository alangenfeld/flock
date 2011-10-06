$(document).ready(function() {
   var category_query = 'http://api.justin.tv/api/category/list.json?jsonp=?';
   $.getJSON(category_query, function(categories)
   {
//    $.each(categories, function(i,category)
//    {
         var channel_query = 'http://api.justin.tv/api/stream/list.json?jsonp=?';
         args = { 'category': 'sports' };
         $.getJSON(channel_query, args, function(channels)
         {
            var elSel = document.getElementById('dropdown');
            $.each(channels, function(j, channel)
            {
               var onclick_args = "'" + channel.channel.login + "',this," + j;
               var elOptNew = document.createElement('option');
               elOptNew.text = channel.title;
               elOptNew.value = channel.channel.login;
               var elOptOld = elSel.options[elSel.selectedIndex];  
               try {
                  elSel.add(elOptNew, elSel.length);//elOptOld); // standards compliant; doesn't work in IE
               }
               catch(ex) {
                  elSel.add(elOptNew, elSel.selectedIndex); // IE only
               }
            });
         });
//    });
   });
});

$("#selectVideo").change(function(){
  var e = document.getElementById("selectVideo");
  var strUser = e.options[e.selectedIndex].value;
  var html_code = "<object type=application/x-shockwave-flash height=295 width=353 data=http://www.justin.tv/widgets/jtv_player.swf?channel=" + strUser + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /><param name=flashvars value=channel=" + strUser + " bgcolor=#000000><param name=allowFullScreen value=true /><param name=allowscriptaccess value=always /><param name=movie value=http://www.justin.tv/widgets/jtv_player.swf /></object>";
   chooseContent(strUser, 'justin.tv');
   $("#video").append(html_code);
});
