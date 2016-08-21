(function() {
    var IMG_DIR = "img/",
        map_data_path = "data.json",
        map_data,
        map_tile_path = "http://devilesk.com/media/images/map/687/",
        map_w = 16384,
        map_h = 16384,
        map_x_boundaries = [-8475.58617377, 9327.49124559],
        map_y_boundaries = [9028.52473332, -8836.61406266],
        zoomify = new OpenLayers.Layer.Zoomify( "Zoomify", map_tile_path, new OpenLayers.Size( map_w, map_h ) ),
        scale = Math.abs(map_x_boundaries[1] - map_x_boundaries[0])/map_w,
        map = new OpenLayers.Map("map", {
            theme: null,
            maxExtent: new OpenLayers.Bounds(0, 0, map_w, map_h),
            numZoomLevels: 5,
            maxResolution: Math.pow(2, 5-1 ),
            units: "m"
        }),
        baseLayers = [
            new OpenLayers.Layer.TMS("Default", map_tile_path, {
                type: "jpg",
                getURL: getMyURL('default')
            }),
            new OpenLayers.Layer.TMS("Desert", map_tile_path, {
                type: "jpg",
                getURL: getMyURL('desert')
            }),
            new OpenLayers.Layer.TMS("Immortal Gardens", map_tile_path, {
                type: "jpg",
                getURL: getMyURL('immortalgardens')
            })
        ],
        layerSwitcher = new OpenLayers.Control.LayerSwitcher({
            ascending: false
        }),
        coordinateControl = new OpenLayers.Control.MousePosition(),
        renderer = OpenLayers.Util.getParameters(window.location.href).renderer,
        drawControls;

    /***********************************
     * QUERY STRING FUNCTIONS *
     ***********************************/

    var trim = (function() {
        "use strict";

        function escapeRegex(string) {
            return string.replace(/[\[\](){}?*+\^$\\.|\-]/g, "\\$&");
        }

        return function trim(str, characters, flags) {
            flags = flags || "g";
            if (typeof str !== "string" || typeof characters !== "string" || typeof flags !== "string") {
                throw new TypeError("argument must be string");
            }

            if (!/^[gi]*$/.test(flags)) {
                throw new TypeError("Invalid flags supplied '" + flags.match(new RegExp("[^gi]*")) + "'");
            }

            characters = escapeRegex(characters);

            return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
        };
    }());

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function setQueryString(key, value) {
        history.pushState(null, "", updateQueryString(key, value));
    }

    function addQueryStringValue(key, value) {
        console.log('addQueryStringValue', key, value);
        var qs = getParameterByName(key);
        qs = trim(trim(qs, ' ;') + ';' + value, ' ;');
        history.pushState(null, "", updateQueryString(key, qs));
    }

    function removeQueryStringValue(key, value) {
        console.log('removeQueryStringValue', key, value);
        var qs = getParameterByName(key);
        qs = trim(trim(qs, ' ;').replace(value, '').replace(/;;/g, ''), ' ;');
        history.pushState(null, "", updateQueryString(key, qs != '' ? qs : null));
    }

    function updateQueryString(key, value, url) {
        if (!url) url = window.location.href;
        var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
            hash;

        if (re.test(url)) {
            if (typeof value !== 'undefined' && value !== null)
                return url.replace(re, '$1' + key + "=" + value + '$2$3');
            else {
                hash = url.split('#');
                url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
                if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                    url += '#' + hash[1];
                return url;
            }
        } else {
            if (typeof value !== 'undefined' && value !== null) {
                var separator = url.indexOf('?') !== -1 ? '&' : '?';
                hash = url.split('#');
                url = hash[0] + separator + key + '=' + value;
                if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                    url += '#' + hash[1];
                return url;
            } else {
                return url;
            }
        }
    }

    /***********************************
     * COORDINATE CONVERSION FUNCTIONS *
     ***********************************/

    function getTileRadius(r) {
        return parseInt(Math.floor(r / 64));
    }

    function lerp(minVal, maxVal, pos_r) {
        return pos_r * (maxVal - minVal) + minVal;
    }

    function reverseLerp(minVal, maxVal, pos) {
        return (pos - minVal) / (maxVal - minVal);
    }

    function latLonToWorld(x, y) {
        var x_r = lerp(map_x_boundaries[0], map_x_boundaries[1], x / map_w),
            y_r = lerp(map_y_boundaries[0], map_y_boundaries[1], (map_h - y) / map_h);

        return {
            x: x_r,
            y: y_r
        };
    }

    function worldToLatLon(x_r, y_r) {
        var x = reverseLerp(map_x_boundaries[0], map_x_boundaries[1], x_r) * map_w,
            y = map_h - reverseLerp(map_y_boundaries[0], map_y_boundaries[1], y_r) * map_h;

        return {
            x: x,
            y: y
        };
    }

    function getScaledRadius(r) {
        return r / (map_x_boundaries[1] - map_x_boundaries[0]) * map_w
    }

    function calculateDistance(order, units, measure) {
        if (order == 1) {
            if (units == "km") {
                return measure * scale * 1000;
            } else {
                return measure * scale;
            }
        } else {
            return measure * scale;
        }
    }

    /********************
     * CONTROL HANDLERS *
     ********************/

    function handleOnClick(event) {
        console.log('handleOnClick');
    }

    function toggleControl() {
        var control;
        var tools = ['drag', 'icon', 'line'];
        $('#toolbar').hide();
        for (var key in drawControls) {
            control = drawControls[key];
            console.log(this.value, key, this.checked);
            if (this.value == key && this.checked) {
                control.activate();
                map.updateSize();
                console.log(key);
                if (tools.indexOf(key) != -1) {
                    $('#toolbar').show();
                    updateTools(key);
                }
                if (key == 'drag') {
                    vectors.events.register("sketchcomplete", drawControls.drag, onBrushSketchCompleted);
                }
                else if (key == 'icon') {
                    vectors.events.register("sketchcomplete", drawControls.icon, onIconSketchCompleted);
                }
            } else {
                control.deactivate();
                if (key == 'drag') {
                    vectors.events.unregister("sketchcomplete", drawControls.drag, onBrushSketchCompleted);
                }
                else if (key == 'icon') {
                    vectors.events.unregister("sketchcomplete", drawControls.icon, onIconSketchCompleted);
                }
            }
        }
        if (this.value === "draw") {
            $('#toolbar').show();
            var selectedTool = document.querySelector('input[name="tool-radio"]:checked');
            if (!selectedTool) {
                selectedTool = document.querySelector('input[name="tool-radio"]');
                selectedTool.checked = true;
                updateTools(selectedTool.value);
            }
            toggleControl.call(selectedTool);
        }
    }
    
    function updateTools(value) {
        console.log("updateTools", value);
        $(".tool-radiobutton").checkboxradio("refresh");
        $('.tool-setting').hide();
        $('.' + value + '-tool-group').css('display', 'inline-block');
    }

    // creates url for tiles. OpenLayers TMS Layer getURL property is set to this
    function getMyURL(baseLayer) {
        return function(bounds) {
            //console.log('getMyURL', baseLayer);
            var res = this.map.getResolution(),
                x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w)),
                y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h)),
                z = map.getZoom(),
                path = z + "/tile_" + x + "_" + y + "." + this.type,
                url = this.url;

            if (url instanceof Array) {
                url = this.selectUrl(path, url)
            }
            return url + baseLayer + '/' + path
        }
    }

    // Initialize map settings based on query string values
    function parseQueryString() {
        var id = getParameterByName('id');
        if (id) {
            $.get('save/' + id + '.json', function (data) {
                console.log(data);
                var parser = new OpenLayers.Format.GeoJSON()
                vectors.addFeatures(parser.read(data));
            });
            map.zoomTo(parseInt(zoom));
        }
        
        var zoom = getParameterByName('zoom');
        if (zoom) {
            map.zoomTo(parseInt(zoom));
        }
        var worldX = getParameterByName('x');
        var worldY = getParameterByName('y');
        if (worldX && worldY) {
            var lonlat = worldToLatLon(worldX, worldY);
            map.setCenter(new OpenLayers.LonLat(lonlat.x, lonlat.y), undefined, false, false);
        }
        
        var baseLayerName = getParameterByName('BaseLayer');
        if (baseLayerName) {
            for (var i = 0; i < baseLayers.length; i++) {
                var layer = baseLayers[i];
                var layerName = layer.name.replace(/ /g, '');
                if (baseLayerName === layerName) {
                    map.setBaseLayer(layer);
                    break;
                }
            }
        }
    }

    function getJSON(path, callback) {
        var request = new XMLHttpRequest();

        request.open('GET', path, true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                var data = JSON.parse(request.responseText);
                callback(data);
            } else {
                alert('Error loading page.');
            }
        };
        request.onerror = function() {
            alert('Error loading page.');
        };
        request.send();
        return request;
    }

    /********************
     * INITITIALIZATION *
     ********************/
    OpenLayers.ImgPath = IMG_DIR;
    
    // Start setting up the map, adding controls and layers
    baseLayers.forEach(function(layer) {
        map.addLayer(layer);
    });
    
    var defaultStyles = {
        brush: {
            strokeWidth: 50,
            strokeColor: '#ff0000',
            strokeOpacity: 1,
            pointRadius: 1,
            fillColor: '#ff0000'
        },
        icon: {
            externalGraphic: null,
            graphicHeight: 512,
            graphicOpacity: 1
        }
    };
    function formatPercent(value) {
        return value + '%';
    }
    
    $.widget( "ui.percentspinner", $.ui.spinner, {
        _format: formatPercent,
        _parse: function(value) { return parseFloat(value); }
    });
    
    var strokeOpacityPreview = document.querySelector('#stroke-opacity-icon .opacity-preview');
    $('#stroke-opacity').percentspinner({
        min: 0,
        max: 100,
        step: 1,
        change: function (event, ui) {
            var v = parseInt(this.value);
            if (isNaN(v)) {
                v = parseInt(defaultStyles.brush.strokeOpacity * 100);
            }
            else {
                defaultStyles.brush.strokeOpacity = v/100;
                strokeOpacityPreview.style.opacity = defaultStyles.brush.strokeOpacity;
            }
            $(this).val(formatPercent(v));
        },
        spin: function(event, ui) {
            strokeOpacityPreview.style.opacity = ui.value/100;
        },
        stop: function (event, ui) {
            var v = parseInt(this.value);
            if (!isNaN(v)) {
                defaultStyles.brush.strokeOpacity = v/100;
                strokeOpacityPreview.style.opacity = defaultStyles.brush.strokeOpacity;
            }
        }
    }).val(formatPercent(defaultStyles.brush.strokeOpacity*100));

    $('#stroke-width').spinner({
        min: 1,
        step: 1,
        change: function (event, ui) {
            var v = parseInt(this.value);
            if (isNaN(v)) {
                v = parseInt(defaultStyles.brush.strokeWidth);
            }
            else {
                defaultStyles.brush.strokeWidth = v;
            }
            $(this).val(v);
        },
        stop: function (event, ui) {
            var v = parseInt(this.value);
            if (!isNaN(v)) {
                defaultStyles.brush.strokeWidth = v;
            }
        }
    }).val(defaultStyles.brush.strokeWidth);
    
    var colorPreview = document.getElementById('color-preview');
    var dragColorPicker = new CP(document.getElementById('drag-color-picker'));
    dragColorPicker.on("enter", function() {
        var color = '#' + this._HSV2HEX(this.set());
        colorPreview.title = color;
        colorPreview.style.backgroundColor = color;
    });
    dragColorPicker.on("change", function(color) {
        this.target.value = '#' + color;
        colorPreview.style.backgroundColor = '#' + color;
        defaultStyles.brush.strokeColor = '#' + color;
    });
    dragColorPicker.on("exit", function() {
        this.target.value = colorPreview.title;
    });
    $('#color-preview').click(function () {
        if (!dragColorPicker.visible) {
            dragColorPicker.enter();
        }
    });
    
    var closeButton = document.createElement('button');
    closeButton.innerHTML = 'Close';
    closeButton.className = 'color-picker-close tool-button';
    closeButton.addEventListener("click", function() {
        dragColorPicker.exit();
    }, false);
    dragColorPicker.picker.appendChild(closeButton);
    
    $('#marker-size').spinner({
        min: 32,
        step: 32,
        change: function (event, ui) {
            var v = parseInt(this.value);
            if (isNaN(v)) {
                v = parseInt(defaultStyles.icon.graphicHeight);
            }
            else {
                defaultStyles.icon.graphicHeight = v;
            }
            $(this).val(v);
        },
        stop: function (event, ui) {
            var v = parseInt(this.value);
            if (!isNaN(v)) {
                defaultStyles.icon.graphicHeight = v;
            }
        }
    }).val(defaultStyles.icon.graphicHeight);
    
    var markerOpacityPreview = document.querySelector('#marker-opacity-icon .opacity-preview');
    $('#marker-opacity').percentspinner({
        min: 0,
        max: 100,
        step: 1,
        change: function (event, ui) {
            var v = parseInt(this.value);
            if (isNaN(v)) {
                v = parseInt(defaultStyles.icon.graphicOpacity * 100);
            }
            else {
                defaultStyles.icon.graphicOpacity = v/100;
                markerOpacityPreview.style.opacity = defaultStyles.icon.graphicOpacity;
            }
            $(this).val(formatPercent(v));
        },
        spin: function(event, ui) {
            markerOpacityPreview.style.opacity = ui.value/100;
        },
        stop: function (event, ui) {
            var v = parseInt(this.value);
            if (!isNaN(v)) {
                defaultStyles.icon.graphicOpacity = v/100;
                markerOpacityPreview.style.opacity = defaultStyles.icon.graphicOpacity;
            }
        }
    }).val(formatPercent(defaultStyles.icon.graphicOpacity*100));
    
    function getBrushStyle() {
        return OpenLayers.Util.applyDefaults({}, defaultStyles.brush);
    }
    function getIconStyle() {
        return OpenLayers.Util.applyDefaults({}, defaultStyles.icon);
    }
    
    // Returns style property stored in feature attribute or get current default style property
    var brushStyleContext = {
        getPointRadius: function(feature) {
            return (feature.attributes.style ? feature.attributes.style.pointRadius : getBrushStyle().pointRadius) / map.getResolution();
        },
        getStrokeWidth: function(feature) {
            return (feature.attributes.style ? feature.attributes.style.strokeWidth : getBrushStyle().strokeWidth) / map.getResolution();
        },
        getStrokeColor: function(feature) {
            return feature.attributes.style ? feature.attributes.style.strokeColor : getBrushStyle().strokeColor;
        },
        getStrokeOpacity: function(feature) {
            return feature.attributes.style ? feature.attributes.style.strokeOpacity : getBrushStyle().strokeOpacity;
        }
    };
    var iconStyleContext = {
        getGraphicHeight: function(feature) {
            return (feature.attributes.style ? feature.attributes.style.graphicHeight : getIconStyle().graphicHeight) / map.getResolution();
        },
        getGraphicOpacity: function(feature) {
            return feature.attributes.style ? feature.attributes.style.graphicOpacity : getIconStyle().graphicOpacity;
        },
        getGraphicYOffset: function(feature) {
            var externalGraphic = getIconStyle().externalGraphic
            if (externalGraphic.indexOf('ward_sentry') == -1 && externalGraphic.indexOf('ward_observer') == -1) {
                return -getIconStyle().graphicHeight / map.getResolution() / 2;
            }
            else {
                return -getIconStyle().graphicHeight / map.getResolution();
            }
        },
        getExternalGraphic: function(feature) {
            return feature.attributes.style ? feature.attributes.style.externalGraphic : getIconStyle().externalGraphic;
        }
    };
    var styleContext = {}
    OpenLayers.Util.extend(styleContext, brushStyleContext);
    OpenLayers.Util.extend(styleContext, iconStyleContext);
    
    var brushStyleTemplate = {
        pointRadius: "${getPointRadius}",
        strokeWidth: "${getStrokeWidth}",
        strokeColor: "${getStrokeColor}",
        strokeOpacity: "${getStrokeOpacity}"
    };
    var iconStyleTemplate = {
        graphicOpacity: "${getGraphicOpacity}",
        externalGraphic: "${getExternalGraphic}",
        graphicYOffset: "${getGraphicYOffset}",
        graphicHeight: "${getGraphicHeight}"
    };
    var styleTemplate = {}
    OpenLayers.Util.extend(styleTemplate, brushStyleTemplate);
    OpenLayers.Util.extend(styleTemplate, iconStyleTemplate);
    var style = new OpenLayers.Style(styleTemplate, {context: styleContext});
    var brushStyle = new OpenLayers.Style(brushStyleTemplate, {context: brushStyleContext});
    var iconStyle = new OpenLayers.Style(iconStyleTemplate, {context: iconStyleContext});
    renderer = renderer ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
    var vectors = new OpenLayers.Layer.Vector("Canvas", {
        styleMap: new OpenLayers.StyleMap(style),
        renderers: renderer //["Canvas"]
    });
    map.addLayer(vectors);
    map.addControl(coordinateControl);
    map.addControl(new OpenLayers.Control.TouchNavigation({
        dragPanOptions: {
            enableKinetic: true
        }
    }));
    map.addControl(new OpenLayers.Control.KeyboardDefaults());
    layerSwitcher.onButtonClick = (function (fn) {
        console.log('onButtonClick', fn);
        return function (evt) {
            var button = evt.buttonElement;
            if (button === this.maximizeDiv) {
                $('.olControlLayerSwitcher').removeClass("minimized");
                if (isSmallScreen()) {
                    minimizeControlList();
                }
            }
            return fn.apply(this, arguments);
        }
    })(layerSwitcher.onButtonClick);
    layerSwitcher.minimizeControl = function (e) {
        console.log('minimizeControl');
        $('.olControlLayerSwitcher').addClass("minimized");
        this.showControls(true);

        if (e != null) {
            OpenLayers.Event.stop(e);
        }
    }
    layerSwitcher.loadContents = function () {
        // layers list div
        this.layersDiv = document.createElement("div");
        this.layersDiv.id = this.id + "_layersDiv";
        OpenLayers.Element.addClass(this.layersDiv, "layersDiv");

        this.baseLbl = document.createElement("div");
        this.baseLbl.innerHTML = OpenLayers.i18n("Base Layer");
        OpenLayers.Element.addClass(this.baseLbl, "baseLbl");

        this.baseLayersDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.baseLayersDiv, "baseLayersDiv");

        this.dataLbl = document.createElement("div");
        this.dataLbl.innerHTML = OpenLayers.i18n("Overlays");
        OpenLayers.Element.addClass(this.dataLbl, "dataLbl");

        this.dataLayersDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.dataLayersDiv, "dataLayersDiv");

        if (this.ascending) {
            this.layersDiv.appendChild(this.baseLbl);
            this.layersDiv.appendChild(this.baseLayersDiv);
            this.layersDiv.appendChild(this.dataLbl);
            this.layersDiv.appendChild(this.dataLayersDiv);
        } else {
            this.layersDiv.appendChild(this.dataLbl);
            this.layersDiv.appendChild(this.dataLayersDiv);
            this.layersDiv.appendChild(this.baseLbl);
            this.layersDiv.appendChild(this.baseLayersDiv);
        }

        this.div.appendChild(this.layersDiv);

        // maximize button div
        this.maximizeDiv = OpenLayers.Util.createAlphaImageDiv(
                                    "OpenLayers_Control_MaximizeDiv",
                                    null,
                                    null,
                                    null,
                                    "initial");
        OpenLayers.Element.addClass(this.maximizeDiv, "maximizeDiv olButton");
        this.maximizeDiv.style.display = "none";

        this.div.appendChild(this.maximizeDiv);

        // minimize button div
        this.minimizeDiv = OpenLayers.Util.createAlphaImageDiv(
                                    "OpenLayers_Control_MinimizeDiv",
                                    null,
                                    null,
                                    null,
                                    "initial");
        OpenLayers.Element.addClass(this.minimizeDiv, "minimizeDiv olButton");
        this.minimizeDiv.style.display = "none";

        this.maximizeDiv.innerHTML;
        this.minimizeDiv.innerHTML = '&times;';
        $(this.maximizeDiv).empty().append($('<i class="fa fa-bars">'));
        this.div.appendChild(this.minimizeDiv);
    }
    map.addControl(layerSwitcher);
    layerSwitcher.maximizeControl();
    if (!map.getCenter()) {
        map.zoomToMaxExtent();
    }

    // Controls configuration
    drawControls = {
        drag: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Path,
        {
            handlerOptions: {
                freehand: true,
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(brushStyle)
                }
            }//,
            // title: "DrawFeature",
            // displayClass: "olControlDrawFeaturePolygon",
            //multi: true
        }),
        icon: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Point,
        {
            handlerOptions: {
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(iconStyle)
                }
            }
        }),
        line: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Path,
        {
            handlerOptions: {
                freehand: false,
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(brushStyle)
                }
            }//,
            // title: "DrawFeature",
            // displayClass: "olControlDrawFeaturePolygon",
            //multi: true
        })
    };
    /*drawControls.drag.setStyle({
        strokeWidth: 50,
        strokeColor: '#ff0000',
        strokeOpacity: 1
    });*/
    function onBrushSketchCompleted(event) {
        event.feature.attributes.style = getBrushStyle();
    }
    function onIconSketchCompleted(event) {
        event.feature.attributes.style = getIconStyle();
    }
    /*drawControls.icon.setStyle({
        externalGraphic: null,
        graphicHeight: 512,
        graphicOpacity: 1
    });*/
    console.log('drawControls', drawControls.icon.style);
    // Add controls to map
    for (var key in drawControls) {
        map.addControl(drawControls[key]);
    }

    map.events.register("zoomend", map, function(){
        setQueryString('zoom', map.zoom);
    });

    map.events.register("moveend", map, function(){
        var worldXY = latLonToWorld(map.center.lon, map.center.lat);
        setQueryString('x', worldXY.x.toFixed(0));
        setQueryString('y', worldXY.y.toFixed(0));
    });

    // X/Y coordinate update display handler
    coordinateControl.formatOutput = function (lonlat) {
        var worldXY = latLonToWorld(lonlat.lon, lonlat.lat);
        return worldXY.x.toFixed(0) + ', ' + worldXY.y.toFixed(0);
    };

    // Show/hide controls panel
    document.getElementById("controls-max").addEventListener("click", function(e) {
        $('#controls-container').removeClass('minimized');
        if (isSmallScreen()) {
            layerSwitcher.minimizeControl();
        }
        if (e) e.preventDefault();
    }, false);
    function minimizeControlList(e) {
        $('#controls-container').addClass('minimized');
        if (e) e.preventDefault();
    }
    document.getElementById("controls-min").addEventListener("click", minimizeControlList, false);
    
    // Check screen size
    function isSmallScreen() {
        return ((window.innerWidth > 0) ? window.innerWidth : screen.width) <= 768;
    }
    // Initially hide controls if screen is small
    if (isSmallScreen()) {
        minimizeControlList.call(document.getElementById("controls-min"));
        layerSwitcher.minimizeControl();
    }

    // Set up panel radio button toggle handlers
    document.getElementById('noneToggle').addEventListener('click', toggleControl, false);
    document.getElementById('drawToggle').addEventListener('click', toggleControl, false);
    
    $.widget("custom.iconselectmenu", $.ui.selectmenu, {
        _renderItem: function(ul, item) {
            var li = $("<li>"),
                wrapper = $("<div>");

            if (item.disabled) {
                li.addClass("ui-state-disabled");
            }

            $("<div>", {
                    "class": 'selectmenu-label',
                    text: item.label
                })
                .appendTo(wrapper);
                
            $("<div>", {
                    style: item.element.attr("data-style"),
                    "class": "selectmenu-icon " + item.element.attr("data-class")
                })
                .appendTo(wrapper);

            return li.append(wrapper).appendTo(ul);
        }
    });
    
    getJSON("sprite_manifest.json", function (data) {
        var img_root = '/media/images/miniheroes/';
        for (var i = 0; i < data.heroes.length; i++) {
            var $option = $('<option value="' + img_root + data.heroes[i].file + '">').text(data.heroes[i].name).attr("data-class", 'icon-miniheroes_' + data.heroes[i].id);
            $('#marker-image').append($option);
        }
        for (var i = 0; i < data.other.length; i++) {
            var $option = $('<option value="' + img_root + data.other[i].file + '">').text(data.other[i].name).attr("data-class", 'icon-miniheroes_' + data.other[i].id);
            $('#marker-image').append($option);
        }
        
        $( "#marker-image" ).iconselectmenu({
            change: function( event, ui ) {
                console.log('change', event, ui);
                defaultStyles.icon.externalGraphic = ui.item.value;
            }
        });
        
        defaultStyles.icon.externalGraphic = $('#marker-image > option')[0].value;
    });
    
    $(".tool-radiobutton").checkboxradio({
        icon: false
    }).change(toggleControl);
    $("#tool-field").controlgroup();
    
    /*$( "#tool-select" ).iconselectmenu({
        change: function( event, ui ) {
            console.log('change', event, ui);
            drawControls.icon.setStyle({externalGraphic: ui.item.value});
        }
    });*/
    $("#toolbar").hide();
    
    vectors.redoStack = [];
    function drawUndo() {
        console.log('undo');
        if (vectors.features.length) {
            var feature = vectors.features.pop();
            vectors.removeFeatures([feature]);
            vectors.redoStack.push(feature);
        }
    }
    function drawRedo() {
        if (vectors.redoStack.length) {
            var feature = vectors.redoStack.pop();
            vectors.addFeatures([feature]);
        }
    }
    $('#draw-undo').click(drawUndo);
    $('#draw-redo').click(drawRedo);
    OpenLayers.Event.observe(document, "keydown", function(evt) {
        var handled = false;
        console.log(evt.keyCode);
        switch (evt.keyCode) {
            case 90: // z
                if (evt.metaKey || evt.ctrlKey) {
                    console.log(vectors.features);
                    drawUndo();
                    //drawControls.drag.undo();
                    handled = true;
                }
                break;
            case 89: // y
                if (evt.metaKey || evt.ctrlKey) {
                    //drawControls.drag.redo();
                    drawRedo();
                    handled = true;
                }
                break;
            case 27: // esc
                //drawControls.drag.cancel();
                handled = true;
                break;
        }
        if (handled) {
            OpenLayers.Event.stop(evt);
        }
    });
    
    $('#save').click(function () {
        var parser = new OpenLayers.Format.GeoJSON()
        var serialized = parser.write(vectors.features);
        //serialized = {};
        $.ajax({
            type: "POST",
            url: "save.php",
            data: {'data': serialized},
            dataType: "json",
            success: function (data){
                var saveLink = [location.protocol, '//', location.host, location.pathname].join('') + '?id=' + data.file;
                console.log(saveLink);
            },
            failure: function (errMsg) {
                alert("Save request failed.");
            }
        });
    });
    
    $( document ).tooltip();
    
    parseQueryString();
}());