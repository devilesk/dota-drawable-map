var OpenLayers = require("./OpenLayers.js");
var $ = require("jquery");
var setQueryString = require("./querystringutil").setQueryString;

module.exports = OpenLayers.Class(OpenLayers.Control, {

    layer: null,
    
    save: function () {
        // var parser = new OpenLayers.Format.GeoJSON()
        // var serialized = parser.write(this.layer.features);
        // console.log('savemap', {'data': serialized});
        // var request = new XMLHttpRequest();
        // request.open('POST', this.url, true);
        // request.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
        // request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8"');
        
        // request.onload = function() {
            // if (request.status >= 200 && request.status < 400) {
                // Success!
                // var data = request.responseText;            
                // var saveLink = [location.protocol, '//', location.host, location.pathname].join('') + '?id=' + data.file;
                // console.log(saveLink);
            // }
            // else {
                // We reached our target server, but it returned an error
                // alert("Save request failed.");
            // }
        // };

        // request.onerror = function() {
            // There was a connection error of some sort
            // alert("Save request failed.");
        // };

        // request.send('{"data":' + serialized + '}');
        
        var parser = new OpenLayers.Format.GeoJSON()
        var serialized = parser.write(this.layer.features);
        console.log('savedrawing', {'data': serialized});
        $("#save-link").hide();
        $("#save-container").removeClass("has-link");
        $.ajax({
            type: "POST",
            url: this.url,
            data: {'data': serialized},
            dataType: "json",
            success: function (data){
                if (data.error) {
                    alert("Save request failed.");
                }
                else {
                    var saveLink = [location.protocol, '//', location.host, location.pathname].join('') + '?id=' + data.file;
                    console.log(saveLink);
                    setQueryString("id", data.file);
                    $("#save-container").addClass("has-link");
                    $("#save-link-message").attr("href", saveLink);
                    $("#save-link-message").text(saveLink);
                    $("#save-link").off("click").fadeIn();
                    $("#save-link").click(function () {
                        $("#save-link-modal").dialog("open");
                    });
                }
            },
            failure: function (errMsg) {
                alert("Save request failed.");
            }
        });
    },
    
    initialize: function(map, layer, div, url, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.map = map;
        this.layer = layer;
        this.div = div;
        this.url = url;
        this.div.addEventListener('click', this.save.bind(this), false);
    },

    CLASS_NAME: "OpenLayers.Control.SaveMap"
});