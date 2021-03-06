var OpenLayers = require("./OpenLayers.js");
var d3scaleLinear = require("d3-scale").scaleLinear;
var d3geoTransform = require("d3-geo").geoTransform;
var d3geoPath = require("d3-geo").geoPath;
var d3select = require("d3-selection").select;

module.exports = OpenLayers.Class(OpenLayers.Control, {

    width: 1024,
    height: 1024,
    x: null,
    y: null,
    id: "export-svg",
    yExtent: [0, 16384],
    xExtent: [0, 16384],
    projection: null,
    path: null,
    svg: null,
 
    stylePropMap: {
        fillColor: 'fill',
        fillOpacity: 'fill-opacity',
        strokeColor: 'stroke',
        strokeWidth: 'stroke-width',
        strokeOpacity: 'stroke-opacity',
        graphicOpacity: 'opacity'
    },
    
    imagesToLoad: 0,
    layer: null,
    
    initialize: function(map, layer, div, map_tile_path, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.map = map;
        this.layer = layer;
        this.div = div;
        this.map_tile_path = map_tile_path;
        console.log("EXPORTMAP CONTROL", this.map);
        this.x = d3scaleLinear().range([0, this.width]);
        this.y = d3scaleLinear().range([0, this.height]);
        var self = this;
        this.projection = d3geoTransform({
            point: function(px, py) {
                this.stream.point(self.x(px), self.height - self.y(py));
            }
        })
        this.path = d3geoPath().projection(this.projection);
        this.x.domain(this.xExtent);
        this.y.domain(this.yExtent);
        
        this.div.addEventListener('click', this.doExport.bind(this), false);
        var self = this;
        this.setStyle = function (d) {
            console.log(this, d3select(this), self, d);
            for (var p in self.stylePropMap) {
                if (d.properties.style[p]) {
                    console.log(p);
                    var val = d.properties.style[p];
                    if (p == 'strokeWidth') {
                        val = self.x(val);
                    }
                    if (p == 'fillColor' && d.geometry.type == 'LineString') val = 'none';
                    d3select(this).style(self.stylePropMap[p], val);
                }
                else if (p == 'fillColor') {
                    console.log('fillColor none', d.geometry.type);
                    d3select(this).style(self.stylePropMap[p], "none");
                }
                else {
                    //console.log(p);
                }
            }
            if (d.properties.style.externalGraphic) {
                console.log('imagesToLoad', self.imagesToLoad);
                var val = d.properties.style.externalGraphic;
                console.log('externalGraphic', val);
                
                if (val.indexOf('ward_sentry') == -1 && val.indexOf('ward_observer') == -1) {
                    var yPos = self.height - self.y(d.geometry.coordinates[1]) - self.x(d.properties.style.graphicHeight) / 2;
                }
                else {
                    var yPos = self.height - self.y(d.geometry.coordinates[1]) - self.x(d.properties.style.graphicHeight);
                }
                d3select(this).attr("xlink:href", val)
                    .attr('x', self.x(d.geometry.coordinates[0]) - self.x(d.properties.style.graphicHeight) / 2)
                    .attr('y', yPos)
                    .attr('width', self.x(d.properties.style.graphicHeight))
                    .attr('height', self.x(d.properties.style.graphicHeight));
                self.imagesToLoad++;
                var d3this = this;
                self.getImageBase64(val, function (data) {
                    d3select(d3this)
                        .attr("href", "data:image/png;base64," + data); // replace link by data URI
                    self.imagesToLoad--;
                    self.imageLoadFinished();
                })
            }
        }
    },
    
    imageLoadFinished: function (callback) {
        if (this.imagesToLoad == 0) {
            this.download_png();
        }
    },

    featureFilter: function (e) {
        return function(d) {
            console.log(d.geometry.type);
            return d.geometry.type == e;
        }
    },
    
    createSVG: function (data) {
        console.log(data);
        if (this.svg) this.svg.remove();
        this.svg = d3select("body").append("svg")
            .attr("id", this.id)
            .attr("width", this.width)
            .attr("height", this.height);
            
        // add index of element as zIndex so they can be ordered properly later
        data.features.forEach(function (d, i) {
            d.zIndex = i;
            console.log(d);
        });

        // background element
        console.log(this.map.baseLayer);
        var background = this.map_tile_path + this.map.baseLayer.map_patch + "/" + this.map.baseLayer.map_id + "/dotamap" + (this.map.baseLayer.map_id == 'default' ? '' : '_' + this.map.baseLayer.map_id) + "5_25.jpg";
        this.svg.append("image")
            .attr("class", "background")
            .attr("xlink:href", background)
            .attr('width', this.width)
            .attr('height', this.height);
        this.imagesToLoad = 1;
        var self = this;
        this.getImageBase64(background, function (data) {
            d3select("#" + self.id + " .background")
                .attr("href", "data:image/png;base64," + data); // replace link by data URI
            self.imagesToLoad--;
            self.imageLoadFinished();
        })
                
        this.svg.selectAll("g").data(data.features.filter(this.featureFilter('Polygon'))).enter().append("path")
            .attr("class", "node")
            .attr("d", this.path)
            .each(this.setStyle);

        this.svg.selectAll("g").data(data.features.filter(this.featureFilter('LineString'))).enter().append("path")
            .attr("class", "node")
            .attr("d", this.path)
            .each(this.setStyle);

        this.svg.selectAll("g").data(data.features.filter(this.featureFilter('Point'))).enter().append("image")
            .attr("class", "node")
            .attr("d", this.path)
            .each(this.setStyle);
            
        // sort by zIndex
        this.svg.selectAll(".node").sort(function (a, b) {
            console.log(a, b);
            if (a.zIndex > b.zIndex) return 1;
            if (a.zIndex < b.zIndex) return -1;
            return 0;
        });
    },
    
    converterEngine: function (input) { // fn BLOB => Binary => Base64 ?
        var uInt8Array = new Uint8Array(input),
            i = uInt8Array.length;
        var biStr = []; //new Array(i);
        while (i--) {
            biStr[i] = String.fromCharCode(uInt8Array[i]);
        }
        var base64 = window.btoa(biStr.join(''));
        //console.log("2. base64 produced >>> " + base64); // print-check conversion result
        return base64;
    },

    getImageBase64: function (url, callback) {
        // 1. Loading file from url:
        var xhr = new XMLHttpRequest(url);
        xhr.open('GET', url, true); // url is the url of a PNG image.
        xhr.responseType = 'arraybuffer';
        xhr.callback = callback;
        var self = this;
        xhr.onload = function (e) {
            if (this.status == 200) { // 2. When loaded, do:
                //console.log("1:Loaded response >>> " + this.response); // print-check xhr response 
                var imgBase64 = self.converterEngine(this.response); // convert BLOB to base64
                this.callback(imgBase64); //execute callback function with data
            }
        };
        xhr.send();
    },
    
    triggerDownload: function (imgURI) {
        console.log('triggerDownload');
        var evt = new MouseEvent('click', {
            view: window,
            bubbles: false,
            cancelable: true
        });

        var a = document.createElement('a');
        a.setAttribute('download', 'image.png');
        a.setAttribute('href', imgURI);
        a.setAttribute('target', '_blank');

        a.dispatchEvent(evt);
    },
    
    download_png: function () {
        var self = this;
        console.log('download_png', d3select("svg"), this.svg, d3select("svg") == this.svg);
        var contents = this.svg.attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().outerHTML;
        var src = 'data:image/svg+xml;utf8,' + contents;
        
        var canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        var ctx = canvas.getContext('2d');
        var data = (new XMLSerializer()).serializeToString(this.svg.attr("version", 1.1).attr("xmlns", "http://www.w3.org/2000/svg").node());
        console.log(data);
        var DOMURL = window.URL || window.webkitURL || window;

        var img = new Image();
        var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
        var url = DOMURL.createObjectURL(svgBlob);

        img.onload = function () {
            console.log('onload');
            //ctx.drawImage(img, 0, 0);
            ctx.drawImage(img, 0, 0, this.width, this.height);
            self.downloadCanvas(canvas);
            DOMURL.revokeObjectURL(url);

            /*var imgURI = canvas
                .toDataURL('image/png')
                .replace('image/png', 'image/octet-stream');

            self.triggerDownload(imgURI);*/
        };

        img.src = url;
    },

    dataURLtoBlob: function (dataurl) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    },

    downloadCanvas: function (_canvasObject) {
        var link = document.createElement("a");
        //var imgData = _canvasObject.toDataURL({format: 'png', multiplier: 4});
        //var strDataURI = imgData.substr(22, imgData.length);
        //var blob = this.dataURLtoBlob(imgData);
        _canvasObject.toBlob(function (blob) {
            var objurl = URL.createObjectURL(blob);

            link.download = "image.png";

            link.href = objurl;

            document.body.appendChild(link); // Required for FF
            link.click();
            document.body.removeChild(link); // Required for FF
        });
    },
    
    doExport: function () {
        var parser = new OpenLayers.Format.GeoJSON()
        console.log('this.layer.features', this.layer, this.layer.features);
        var data = JSON.parse(parser.write(this.layer.features));
        console.log(data, this.layer.features);
        this.createSVG(data, this.download_png);
    },

    CLASS_NAME: "OpenLayers.Control.ExportMap"
});