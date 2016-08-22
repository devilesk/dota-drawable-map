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
        renderer = OpenLayers.Util.getParameters(window.location.href).renderer,
        drawControls,
        defaultHandlerOptions = {
            regularpolygon: {
                snapAngle: 0,
                sides: 4
            }
        },
        defaultStyles = {
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
            },
            line: {
                strokeWidth: 25,
                strokeColor: '#00ff00',
                strokeOpacity: 1,
                pointRadius: 1,
                fillColor: '#00ff00'
            },
            polygon: {
                strokeWidth: 10,
                strokeColor: '#0000ff',
                strokeOpacity: 1,
                pointRadius: 1,
                fillColor: '#ff00ff',
                fillOpacity: 0.5
            },
            regularpolygon: {
                strokeWidth: 20,
                strokeColor: '#00ffff',
                strokeOpacity: 1,
                pointRadius: 1,
                fillColor: '#aa00ff',
                fillOpacity: 1
            }
        },
        strokeTools = ['brush', 'line', 'polygon', 'regularpolygon'];

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

    /**************
     * UI WIDGETS *
     **************/

    function formatDegree(value) {
        return value + '°';
    }
    
    $.widget( "ui.degreespinner", $.ui.spinner, {
        _format: formatDegree,
        _parse: function(value) { return parseFloat(value); }
    });

    function formatPercent(value) {
        return value + '%';
    }
    
    $.widget( "ui.percentspinner", $.ui.spinner, {
        _format: formatPercent,
        _parse: function(value) { return parseFloat(value); }
    });
    
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
    
    /********************
     * CONTROL HANDLERS *
     ********************/

    function toggleControl() {
        var control;
        var tools = Object.keys(defaultStyles);
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
                    vectors.events.register("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
                }
            } else {
                control.deactivate();
                if (tools.indexOf(key) != -1) {
                    vectors.events.unregister("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
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

    /******************
     * STROKE UI INIT *
     ******************/

    strokeTools.forEach(function (key) {
        initStrokeWidth(key);
        initStrokeOpacity(key);
        initStrokeColor(key);
    });
    initStrokeOpacity('polygon', true);
    initStrokeColor('polygon', true);
    initStrokeOpacity('regularpolygon', true);
    initStrokeColor('regularpolygon', true);
    initDegreeSpinner('regularpolygon', 'snap-angle', 'snapAngle');
    initSpinner('regularpolygon', 'side-count', 'sides', {
        min: 3,
        step: 1
    })
    // stroke width spinner
    function initStrokeWidth(key) {
        $('#' + key + '-stroke-width').spinner({
            min: 1,
            step: 1,
            change: function (event, ui) {
                var v = parseInt(this.value);
                if (isNaN(v)) {
                    v = parseInt(defaultStyles[key].strokeWidth);
                }
                else {
                    defaultStyles[key].strokeWidth = v;
                }
                $(this).val(v);
            },
            stop: function (event, ui) {
                var v = parseInt(this.value);
                if (!isNaN(v)) {
                    defaultStyles[key].strokeWidth = v;
                }
            }
        }).val(defaultStyles[key].strokeWidth);
    }
    
    // stroke opacity spinner
    function initStrokeOpacity(key, isFill) {
        var target = isFill ? 'fill' : 'stroke';
        var strokeOpacityPreview = document.querySelector('#' + key + '-' + target + '-opacity-icon .opacity-preview');
        $('#' + key + '-' + target + '-opacity').percentspinner({
            min: 0,
            max: 100,
            step: 1,
            change: function (event, ui) {
                var v = parseInt(this.value);
                if (isNaN(v)) {
                    v = parseInt(defaultStyles[key][target + 'Opacity'] * 100);
                }
                else {
                    defaultStyles[key][target + 'Opacity'] = v/100;
                    strokeOpacityPreview.style.opacity = defaultStyles[key][target + 'Opacity'];
                }
                $(this).val(formatPercent(v));
            },
            spin: function(event, ui) {
                strokeOpacityPreview.style.opacity = ui.value/100;
            },
            stop: function (event, ui) {
                var v = parseInt(this.value);
                if (!isNaN(v)) {
                    defaultStyles[key][target + 'Opacity'] = v/100;
                    strokeOpacityPreview.style.opacity = defaultStyles[key][target + 'Opacity'];
                }
            }
        }).val(formatPercent(defaultStyles[key][target + 'Opacity']*100));
    }
    
    // stroke color picker
    function initStrokeColor(key, isFill) {
        var target = isFill ? 'fill' : 'stroke';
        var colorPreview = document.getElementById(key + '-' + target + '-color-preview');
        var colorPicker = new CP(document.getElementById(key + '-' + target + '-color-picker'));
        colorPicker.set(defaultStyles[key][target + 'Color']);
        colorPicker.on("enter", function() {
            var color = '#' + this._HSV2HEX(this.set());
            colorPreview.title = color;
            colorPreview.style.backgroundColor = color;
        });
        colorPicker.on("change", function(color) {
            this.target.value = '#' + color;
            colorPreview.style.backgroundColor = '#' + color;
            defaultStyles[key][target + 'Color'] = '#' + color;
        });
        colorPicker.on("exit", function() {
            this.target.value = colorPreview.title;
        });
        $(colorPreview).click(function () {
            if (!colorPicker.visible) {
                colorPicker.enter();
            }
        });
        
        var closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.className = 'color-picker-close tool-button';
        closeButton.addEventListener("click", function() {
            colorPicker.exit();
        }, false);
        colorPicker.picker.appendChild(closeButton);
    }
    
    function initDegreeSpinner(key, name, prop) {
        $('#' + key + '-' + name).degreespinner({
            min: 0,
            max: 360,
            step: 1,
            change: function (event, ui) {
                var v = parseInt(this.value);
                if (isNaN(v)) {
                    v = parseInt(defaultHandlerOptions[key][prop]);
                }
                else {
                    defaultHandlerOptions[key][prop] = v;
                    updateHandlerOption(key, prop, v);
                }
                $(this).val(formatDegree(v));
            },
            stop: function (event, ui) {
                var v = parseInt(this.value);
                if (!isNaN(v)) {
                    defaultHandlerOptions[key][prop] = v;
                    updateHandlerOption(key, prop, v);
                }
            }
        }).val(formatDegree(defaultHandlerOptions[key][prop]));
    }
    
    function initSpinner(key, name, prop, options, spinnerType, formatFunction) {
        var spinnerType = spinnerType || 'spinner';
        var formatFunction = formatFunction || identity;
        $('#' + key + '-' + name)[spinnerType](OpenLayers.Util.extend({
            change: function (event, ui) {
                var v = parseInt(this.value);
                if (isNaN(v)) {
                    v = parseInt(defaultHandlerOptions[key][prop]);
                }
                else {
                    defaultHandlerOptions[key][prop] = v;
                    updateHandlerOption(key, prop, v);
                }
                $(this).val(formatFunction(v));
            },
            stop: function (event, ui) {
                var v = parseInt(this.value);
                if (!isNaN(v)) {
                    defaultHandlerOptions[key][prop] = v;
                    updateHandlerOption(key, prop, v);
                }
            }
        }, options)).val(formatFunction(defaultHandlerOptions[key][prop]));
    }
    
    function identity(v) { return v };
    
    function updateHandlerOption(key, prop, value) {
        var option = {};
        option[prop] = value;
        drawControls[key].handler.setOptions(option);
    }
    
    /****************
     * ICON UI INIT *
     ****************/
     
     // marker size spinner
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
    
    // marker opacity spinner
    var markerOpacityPreview = document.querySelector('#marker-opacity-icon .icon-opacity-preview');
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
    
    // icon select dropdown
    $.getJSON("sprite_manifest.json", function (data) {
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
    
    /********************
     * INITITIALIZATION *
     ********************/
     
    // listen to key presses
    OpenLayers.Event.observe(document, "keydown", function(evt) {
        var handled = false;
        console.log(evt.keyCode);
        switch (evt.keyCode) {
            case 90: // z
                if (evt.metaKey || evt.ctrlKey) {
                    console.log(vectors.features);
                    drawUndo();
                    handled = true;
                }
                break;
            case 89: // y
                if (evt.metaKey || evt.ctrlKey) {
                    drawRedo();
                    handled = true;
                }
                break;
            case 27: // esc
                handled = true;
                break;
        }
        if (handled) {
            OpenLayers.Event.stop(evt);
        }
    });
    
    OpenLayers.ImgPath = IMG_DIR;
    
    // Start setting up the map, adding controls and layers
    baseLayers.forEach(function(layer) {
        map.addLayer(layer);
    });
    
    function getStyle(key) {
        return OpenLayers.Util.applyDefaults({}, defaultStyles[key]);
    }
    
    function createStrokeStyleContext(key) {
        return {
            getPointRadius: function(feature) {
                return (feature.attributes.style ? feature.attributes.style.pointRadius : getStyle(key).pointRadius) / map.getResolution();
            },
            getStrokeWidth: function(feature) {
                return (feature.attributes.style ? feature.attributes.style.strokeWidth : getStyle(key).strokeWidth) / map.getResolution();
            },
            getStrokeColor: function(feature) {
                return feature.attributes.style ? feature.attributes.style.strokeColor : getStyle(key).strokeColor;
            },
            getStrokeOpacity: function(feature) {
                return feature.attributes.style ? feature.attributes.style.strokeOpacity : getStyle(key).strokeOpacity;
            }
        }
    }
    
    function createFillStyleContext(key) {
        return {
            getFillColor: function(feature) {
                return feature.attributes.style ? feature.attributes.style.fillColor : getStyle(key).fillColor;
            },
            getFillOpacity: function(feature) {
                return feature.attributes.style ? feature.attributes.style.fillOpacity : getStyle(key).fillOpacity;
            }
        }
    }
    
    // Returns style property stored in feature attribute or get current default style property
    var styleContexts = {
        'default': {},
        brush: createStrokeStyleContext('brush'),
        line: createStrokeStyleContext('line'),
        polygon: OpenLayers.Util.extend(createStrokeStyleContext('polygon'), createFillStyleContext('polygon')),
        regularpolygon: OpenLayers.Util.extend(createStrokeStyleContext('regularpolygon'), createFillStyleContext('regularpolygon')),
        icon: {
            getGraphicHeight: function(feature) {
                return (feature.attributes.style ? feature.attributes.style.graphicHeight : getStyle('icon').graphicHeight) / map.getResolution();
            },
            getGraphicOpacity: function(feature) {
                return feature.attributes.style ? feature.attributes.style.graphicOpacity : getStyle('icon').graphicOpacity;
            },
            getGraphicYOffset: function(feature) {
                var externalGraphic = getStyle('icon').externalGraphic
                if (externalGraphic.indexOf('ward_sentry') == -1 && externalGraphic.indexOf('ward_observer') == -1) {
                    return -getStyle('icon').graphicHeight / map.getResolution() / 2;
                }
                else {
                    return -getStyle('icon').graphicHeight / map.getResolution();
                }
            },
            getExternalGraphic: function(feature) {
                return feature.attributes.style ? feature.attributes.style.externalGraphic : getStyle('icon').externalGraphic;
            }
        }
    }

    for (k in defaultStyles) {
        if (defaultStyles.hasOwnProperty(k)) {
            OpenLayers.Util.extend(styleContexts['default'], styleContexts[k]);
        }
    }
    
    var styleTemplates = {
        'default': {},
        brush: {
            pointRadius: "${getPointRadius}",
            strokeWidth: "${getStrokeWidth}",
            strokeColor: "${getStrokeColor}",
            strokeOpacity: "${getStrokeOpacity}"
        },
        line: {
            pointRadius: "${getPointRadius}",
            strokeWidth: "${getStrokeWidth}",
            strokeColor: "${getStrokeColor}",
            strokeOpacity: "${getStrokeOpacity}"
        },
        polygon: {
            pointRadius: "${getPointRadius}",
            strokeWidth: "${getStrokeWidth}",
            strokeColor: "${getStrokeColor}",
            strokeOpacity: "${getStrokeOpacity}",
            fillColor: "${getFillColor}",
            fillOpacity: "${getFillOpacity}"
        },
        regularpolygon: {
            pointRadius: "${getPointRadius}",
            strokeWidth: "${getStrokeWidth}",
            strokeColor: "${getStrokeColor}",
            strokeOpacity: "${getStrokeOpacity}",
            fillColor: "${getFillColor}",
            fillOpacity: "${getFillOpacity}"
        },
        icon: {
            graphicOpacity: "${getGraphicOpacity}",
            externalGraphic: "${getExternalGraphic}",
            graphicYOffset: "${getGraphicYOffset}",
            graphicHeight: "${getGraphicHeight}"
        }
    }

    var defaultStyleTemplate = {}
    for (k in defaultStyles) {
        if (defaultStyles.hasOwnProperty(k)) {
            OpenLayers.Util.extend(styleTemplates['default'], styleTemplates[k]);
        }
    }
    
    var styles = {
        'default': new OpenLayers.Style(styleTemplates['default'], {context: styleContexts['default']})
    }
    for (k in defaultStyles) {
        if (defaultStyles.hasOwnProperty(k)) {
            styles[k] = new OpenLayers.Style(styleTemplates[k], {context: styleContexts[k]});
        }
    }
    
    renderer = renderer ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
    var vectors = new OpenLayers.Layer.Vector("Canvas", {
        styleMap: new OpenLayers.StyleMap(styles['default']),
        renderers: renderer //["Canvas"]
    });
    map.addLayer(vectors);
    
    // X/Y coordinate update control
    var coordinateControl = new OpenLayers.Control.MousePosition();
    coordinateControl.formatOutput = function (lonlat) {
        var worldXY = latLonToWorld(lonlat.lon, lonlat.lat);
        return worldXY.x.toFixed(0) + ', ' + worldXY.y.toFixed(0);
    };
    map.addControl(coordinateControl);
    
    map.addControl(new OpenLayers.Control.TouchNavigation({
        dragPanOptions: {
            enableKinetic: true
        }
    }));
    map.addControl(new OpenLayers.Control.KeyboardDefaults());
    
    layerSwitcher.onButtonClick = (function (fn) {
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
        brush: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Path,
        {
            handlerOptions: {
                freehand: true,
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(styles.brush)
                }
            }
        }),
        icon: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Point,
        {
            handlerOptions: {
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(styles.icon)
                }
            }
        }),
        line: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Path,
        {
            handlerOptions: {
                freehand: false,
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(styles.line)
                }
            }
        }),
        polygon: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.Polygon,
        {
            handlerOptions: {
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(styles.polygon)
                }
            }
        }),
        regularpolygon: new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.RegularPolygon,
        {
            handlerOptions: OpenLayers.Util.extend(defaultHandlerOptions.regularpolygon, {
                layerOptions: {
                    styleMap: new OpenLayers.StyleMap(styles.regularpolygon)
                }
            })
        })
    };
    
    function createSketchCompletedHandler(key) {
        return function (event) {
            event.feature.attributes.style = getStyle(key);
        }
    }
    
    var onSketchCompletedHandlers = {
        brush: createSketchCompletedHandler('brush'),
        icon: createSketchCompletedHandler('icon'),
        line: createSketchCompletedHandler('line'),
        polygon: createSketchCompletedHandler('polygon'),
        regularpolygon: createSketchCompletedHandler('regularpolygon')
    }

    // Add controls to map
    for (var key in drawControls) {
        map.addControl(drawControls[key]);
    }

    // map position/zoom tracking querystring update
    map.events.register("zoomend", map, function(){
        setQueryString('zoom', map.zoom);
    });
    map.events.register("moveend", map, function(){
        var worldXY = latLonToWorld(map.center.lon, map.center.lat);
        setQueryString('x', worldXY.x.toFixed(0));
        setQueryString('y', worldXY.y.toFixed(0));
    });

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
    
    // tool switcher ui initialize
    $(".tool-radiobutton").checkboxradio({
        icon: false
    }).change(toggleControl);
    $("#tool-field").controlgroup();
    
    // undo/redo logic
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
    
    // undo/redo ui listen
    $('#draw-undo').click(drawUndo);
    $('#draw-redo').click(drawRedo);
    
    // save drawing
    $('#save').click(function () {
        var parser = new OpenLayers.Format.GeoJSON()
        var serialized = parser.write(vectors.features);
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
    
    // start jquery ui tooltips
    $( document ).tooltip();
    
    parseQueryString();
}());