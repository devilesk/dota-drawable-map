import OpenLayers from 'exports?OpenLayers!../ol2/build/OpenLayers.js';
import ExportMap from "./exportmap";
import $ from 'jquery';

export default OpenLayers.Class(ExportMap, {
    
    id: "share-svg",
    
    doExport: function () {
        $("#share-link").hide();
        $("#share-container").removeClass("has-link");
        ExportMap.prototype.doExport.call(this);
    },
    
    downloadCanvas: function (_canvasObject) {
        try {
            var img = _canvasObject.toDataURL('image/jpeg', .8).split(',')[1];
        } catch (e) {
            var img = _canvasObject.toDataURL().split(',')[1];
        }
        console.log('window', window);
        console.log('this', this);
        console.log('global', global);
        //w.document.write(img);
        // upload to imgur using jquery/CORS
        // https://developer.mozilla.org/En/HTTP_access_control
        $.ajax({
            url: 'https://api.imgur.com/3/image',
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Client-ID ' + 'e6d3cc2364556b2');
            },
            data: {
                type: 'base64',
                // get your key here, quick and fast http://imgur.com/register/api_anon
                //key: 'e6d3cc2364556b2',
                //name: 'neon.jpg',
                //title: 'test title',
                //caption: 'test caption',
                image: img
            },
            dataType: 'json',
            success: function (data){                
                $("#share-container").addClass("has-link");
                $("#share-link-message").attr("href", data.data.link);
                $("#share-link-message").text(data.data.link);
                $("#share-link").off("click").fadeIn();
                $("#share-link").click(function () {
                    $("#share-link-modal").dialog("open");
                });
            },
            failure: function (errMsg) {
                alert('Could not reach api.imgur.com. Sorry :(');
            }
        });
    },
    
    CLASS_NAME: "OpenLayers.Control.ShareMap"
});
