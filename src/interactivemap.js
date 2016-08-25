(function() {
    var IMG_DIR = "images/",
        map_data_path = "data.json",
        map_data,
        map_tile_path = "/media/images/map/687/",
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
            units: "m",
            controls: [
                new OpenLayers.Control.Navigation(),
                new OpenLayers.Control.Zoom({
                    zoomInId: "zoom-in",
                    zoomOutId: "zoom-out"
                })
            ]
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
                snapAngle: 15,
                sides: 4,
                radius: 1000
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
                externalGraphic: "",
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
            },
            modify: {
                strokeWidth: 2,
                strokeColor: '#ff0000',
                strokeOpacity: 1,
                pointRadius: 50,
                fillColor: '#ff0000',
                graphicName: "cross"
            },
            selectfeature: {
                strokeWidth: 2,
                strokeColor: '#ff0000',
                strokeOpacity: 1,
                pointRadius: 50,
                fillColor: '#ff0000',
                graphicName: "cross"
            },
            measure: {
                strokeWidth: 2,
                strokeColor: '#ff0000',
                strokeOpacity: 1,
                pointRadius: 50,
                fillColor: '#ff0000',
                graphicName: "cross"
            }
        },
        activeTool,
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

    function toggleModifyControl() {
        console.log(this.value);
        drawControls.modify.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
        switch (this.value) {
            case 'reshape':
                drawControls.modify.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
            break;
            case 'rotate':
                drawControls.modify.mode = OpenLayers.Control.ModifyFeature.ROTATE;
            break;
            case 'scale':
                drawControls.modify.mode |= OpenLayers.Control.ModifyFeature.RESIZE;
                drawControls.modify.mode &= ~OpenLayers.Control.ModifyFeature.RESHAPE;
            break;
            case 'skew':
                drawControls.modify.mode |= OpenLayers.Control.ModifyFeature.RESIZE;
            break;
            case 'drag':
                drawControls.modify.mode = OpenLayers.Control.ModifyFeature.DRAG;
            break;
        }
        console.log('drawControls.modify', drawControls.modify);
        var feature = drawControls.modify.feature;
        if (feature) {
            drawControls.modify.unselectFeature(feature);
            drawControls.modify.selectFeature(feature);
        }
    }
    
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
                    if (key == 'modify') {
                        //vectors.events.register("beforefeaturemodified", drawControls[key], onFeatureModified);
                        vectors.events.register("afterfeaturemodified", drawControls[key], onFeatureModified);
                    }
                    else {
                        vectors.events.register("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
                    }
                }
            } else {
                control.deactivate();
                if (tools.indexOf(key) != -1) {
                    if (key == 'modify') {
                        //vectors.events.unregister("beforefeaturemodified", drawControls[key], onFeatureModified);
                        vectors.events.unregister("afterfeaturemodified", drawControls[key], onFeatureModified);
                    }
                    else {
                        vectors.events.unregister("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
                    }
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
        activeTool = value;
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
    });
    initSpinner('regularpolygon', 'radius', 'radius', {
        min: 1,
        step: 1
    });
    
    $('#regularpolygon-snap').checkboxradio({icon: false}).change(function () {
        var key = 'regularpolygon';
        var prop = 'snapAngle';
        var v;
        if (this.checked) {
            v = $(this).data('snapAngle');
            $('#regularpolygon-snap-angle').degreespinner( "enable" );
        }
        else {
            v = null;
            $(this).data('snapAngle', defaultHandlerOptions[key][prop])
            defaultHandlerOptions[key][prop] = null;
            $('#regularpolygon-snap-angle').degreespinner( "disable" );
        }
        defaultHandlerOptions[key][prop] = v;
        updateHandlerOption(key, prop, v);
    }).data('snapAngle', defaultHandlerOptions.regularpolygon.snapAngle);
    
    $('#regularpolygon-fixed-radius').checkboxradio({icon: false}).change(function () {
        var key = 'regularpolygon';
        var prop = 'radius';
        var v;
        if (this.checked) {
            v = $(this).data('radius');
            $('#regularpolygon-radius').spinner( "enable" );
            $('#regularpolygon-irregular').prop('checked', false).checkboxradio( "refresh" );
            updateHandlerOption('regularpolygon', 'irregular', false);
        }
        else {
            v = null;
            $(this).data('radius', defaultHandlerOptions[key][prop])
            defaultHandlerOptions[key][prop] = null;
            $('#regularpolygon-radius').spinner( "disable" );
        }
        defaultHandlerOptions[key][prop] = v;
        updateHandlerOption(key, prop, v);
    }).data('radius', defaultHandlerOptions.regularpolygon.radius);
    
    $('#regularpolygon-irregular').checkboxradio({icon: false}).change(function () {
        var key = 'regularpolygon';
        var prop = 'irregular';
        var v = this.checked;
        if (this.checked) {
            $('#regularpolygon-fixed-radius').prop('checked', false).checkboxradio( "refresh" );
            $('#regularpolygon-radius').spinner( "disable" );
        }
        else {
            
        }
        /*if (this.checked) {
            v = $(this).data('snapAngle');
            $('#regularpolygon-snap-angle').degreespinner( "enable" );
        }
        else {
            v = null;
            $(this).data('snapAngle', defaultHandlerOptions[key][prop])
            defaultHandlerOptions[key][prop] = null;
            $('#regularpolygon-snap-angle').degreespinner( "disable" );
        }
        defaultHandlerOptions[key][prop] = v;*/
        updateHandlerOption(key, prop, v);
    });
    
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
        var strokeOpacityPreview = document.querySelector('#' + key + '-' + target + '-opacity-icon .opacity-preview-icon');
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
    var markerOpacityPreview = document.querySelector('#marker-opacity-icon .opacity-preview-icon');
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
            var $option = $('<option value="' + img_root + data.heroes[i].file + '">').text(data.heroes[i].name).attr("data-class", 'miniheroes-sprite-' + data.heroes[i].id);
            $('#marker-image-dropdown').append($option);
        }
        for (var i = 0; i < data.other.length; i++) {
            var $option = $('<option value="' + img_root + data.other[i].file + '">').text(data.other[i].name).attr("data-class", 'miniheroes-sprite' + data.other[i].id);
            $('#marker-image-dropdown').append($option);
        }
        
        $( "#marker-image-dropdown" ).iconselectmenu({
            change: function( event, ui ) {
                console.log('change', event, ui);
                defaultStyles.icon.externalGraphic = ui.item.value;
            }
        });
        
        defaultStyles.icon.externalGraphic = $('#marker-image-dropdown > option')[0].value;
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
            case 46: // esc
                if (activeTool == 'modify') modifyDeleteFeature();
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
        },
        modify: OpenLayers.Util.extend(createStrokeStyleContext('modify'), {
            getGraphicName: function(feature) {
                console.log('getGraphicName modify', feature.attributes.style ? feature.attributes.style.graphicName : getStyle('modify').graphicName);
                return feature.attributes.style ? feature.attributes.style.graphicName : getStyle('modify').graphicName;
            },
            getExternalGraphic: function(feature) {
                return "";
            }
        })
    }
    
    var styleTemplates = {
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
        },
        modify: {
            pointRadius: "${getPointRadius}",
            strokeWidth: "${getStrokeWidth}",
            strokeColor: "${getStrokeColor}",
            strokeOpacity: "${getStrokeOpacity}",
            externalGraphic: "${getExternalGraphic}",
            graphicName: "${getGraphicName}"
        }
    }

    // Collection of all style objects
    var styles = {
        select: OpenLayers.Feature.Vector.style.select,
        virtual: {
            strokeColor: "#ee9900",
            fillColor: "#ee9900",
            strokeOpacity: 0.3,
            strokeWidth: 2,
            pointRadius: 8,
            fillOpacity: 0.3,
            graphicName: "circle"
        },
        vertex: new OpenLayers.Style(OpenLayers.Util.applyDefaults({
            strokeWidth: 2,
            pointRadius: 8,
            graphicName: "circle",
            externalGraphic: ""
        }, OpenLayers.Feature.Vector.style['default']), {extendDefault: false})
    };
    
    // Styles used by control temporary layers
    for (k in defaultStyles) {
        if (defaultStyles.hasOwnProperty(k)) {
            styles[k] = new OpenLayers.Style(styleTemplates[k], {context: styleContexts[k]});
        }
    }
    var zIndexCounter = 0;
    // Custom default style returns feature attribute style values first with fallback to active tool value
    styles['default'] = new OpenLayers.Style({
        pointRadius: "${getPointRadius}",
        strokeWidth: "${getStrokeWidth}",
        strokeColor: "${getStrokeColor}",
        strokeOpacity: "${getStrokeOpacity}",
        fillColor: "${getFillColor}",
        fillOpacity: "${getFillOpacity}",
        graphicOpacity: "${getGraphicOpacity}",
        externalGraphic: "${getExternalGraphic}",
        graphicYOffset: "${getGraphicYOffset}",
        graphicHeight: "${getGraphicHeight}",
        graphicName: "${getGraphicName}",
        graphicZIndex: "${getGraphicZIndex}"
    },
    {
        extendDefault: true,
        context: {
            getPointRadius: function (feature) {
                return (feature.attributes.style ? feature.attributes.style.pointRadius : getStyle(activeTool).pointRadius) / map.getResolution();
            },
            getStrokeWidth: function (feature) {
                return (feature.attributes.style ? feature.attributes.style.strokeWidth : getStyle(activeTool).strokeWidth) / map.getResolution();
            },
            getStrokeColor: function (feature) {
                return feature.attributes.style ? feature.attributes.style.strokeColor : getStyle(activeTool).strokeColor;
            },
            getStrokeOpacity: function (feature) {
                return feature.attributes.style ? feature.attributes.style.strokeOpacity : getStyle(activeTool).strokeOpacity;
            },
            getFillColor: function (feature) {
                return feature.attributes.style ? feature.attributes.style.fillColor : getStyle(activeTool).fillColor;
            },
            getFillOpacity: function (feature) {
                return feature.attributes.style ? feature.attributes.style.fillOpacity : getStyle(activeTool).fillOpacity;
            },
            getGraphicHeight: function (feature) {
                if (feature.attributes.style) {
                    return feature.attributes.style.graphicHeight / map.getResolution();
                }
                else if (getStyle(activeTool).graphicHeight) {
                    return getStyle(activeTool).graphicHeight / map.getResolution();
                }
                else {
                    return OpenLayers.Feature.Vector.style['default'].graphicHeight;
                }
                return (feature.attributes.style ? feature.attributes.style.graphicHeight : getStyle(activeTool).graphicHeight) / map.getResolution();
            },
            getGraphicOpacity: function (feature) {
                return feature.attributes.style ? feature.attributes.style.graphicOpacity : getStyle(activeTool).graphicOpacity;
            },
            getGraphicYOffset: function (feature) {
                if (feature.attributes.style) {
                    var externalGraphic = feature.attributes.style.externalGraphic;
                    var graphicHeight = feature.attributes.style.graphicHeight;
                }
                else if (getStyle(activeTool).getGraphicYOffset) {
                    var externalGraphic = getStyle(activeTool).externalGraphic;
                    var graphicHeight = getStyle(activeTool).graphicHeight;
                }
                else {
                    return OpenLayers.Feature.Vector.style['default'].getGraphicYOffset;
                }
                if (!externalGraphic || !graphicHeight) return OpenLayers.Feature.Vector.style['default'].getGraphicYOffset;
                
                if (externalGraphic.indexOf('ward_sentry') == -1 && externalGraphic.indexOf('ward_observer') == -1) {
                    return -graphicHeight / map.getResolution() / 2;
                }
                else {
                    return -graphicHeight / map.getResolution();
                }
            },
            getExternalGraphic: function (feature) {
                if (feature.attributes.style) {
                    return feature.attributes.style.externalGraphic;
                }
                else if (getStyle(activeTool).externalGraphic) {
                    return getStyle(activeTool).externalGraphic;
                }
                else {
                    return OpenLayers.Feature.Vector.style['default'].externalGraphic;
                }
                return feature.attributes.style ? feature.attributes.style.externalGraphic : getStyle(activeTool).externalGraphic;
            },
            getGraphicName: function (feature) {
                if (feature.attributes.style) {
                    return feature.attributes.style.graphicName;
                }
                else if (getStyle(activeTool).graphicName) {
                    return getStyle(activeTool).graphicName;
                }
                else {
                    return OpenLayers.Feature.Vector.style['default'].graphicName;
                }
                return feature.attributes.style ? feature.attributes.style.graphicName : getStyle(activeTool).graphicName;
            },
            getGraphicZIndex: function (feature) {
                console.log("graphicZIndex", feature);
                if (feature.attributes.hasOwnProperty('zIndex')) {
                    console.log("graphicZIndex feature.attributes", feature.attributes.zIndex);
                    return feature.attributes.zIndex;
                }
                feature.attributes.zIndex = ++zIndexCounter;
                console.log("graphicZIndex new feature.attributes", feature.attributes.zIndex);
                return feature.attributes.zIndex;
            }
        }
    });
    renderer = renderer ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
    var vectors = new OpenLayers.Layer.Vector("Canvas", {
        styleMap: new OpenLayers.StyleMap({
            'default': styles['default'],
            select: styles.select,
            vertex: styles.vertex
        }),
        rendererOptions: { zIndexing: true },
        renderers: ["Canvas"]//renderer //["Canvas"]
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
        }),
        modify: new OpenLayers.Control.ModifyFeature(vectors, {vertexRenderIntent: "vertex", virtualStyle: styles.virtual}),
        selectfeature: new OpenLayers.Control.SelectFeature(vectors),
        measure: new OpenLayers.Control.Measure(OpenLayers.Handler.Path, {persist: true, immediate: true})
    };
    
    $('#measure-cancel').click(function () {
        drawControls.measure.cancel();
        $('#measure-distance').val("");
    });
    drawControls.measure.events.register("measurepartial", drawControls.measure, handleMeasurements);
    drawControls.measure.events.register("measure", drawControls.measure, handleMeasurements);
    
    function handleMeasurements(event) {
        console.log('handleMeasurements', event);
        var geometry = event.geometry;
        var units = event.units;
        var order = event.order;
        var measure = event.measure;
        var element = document.getElementById('output');
        var out = "";
        if(order == 1) {
            out += measure.toFixed(3) + " " + units;
        } else {
            out += measure.toFixed(3) + " " + units + "<sup>2</" + "sup>";
        }
        $('#measure-distance').val(out);
    }
    
    function createSketchCompletedHandler(key) {
        return function (event) {
            console.log('createSketchCompletedHandler', key);
            //event.feature.attributes.renderIntent = key;
            //event.feature.renderIntent = key;
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

    // Modifying feature resets renderIntent to 'default'. Reset it to stored renderIntent and redraw feature.
    function onFeatureModified(event) {
        console.log('onFeatureModified', OpenLayers.Util.extend({}, event.feature), event.modified);
        //event.feature.renderIntent = event.feature.attributes.renderIntent;
        //event.feature.layer.drawFeature(event.feature);
    }

    // Add controls to map
    for (var key in drawControls) {
        map.addControl(drawControls[key]);
    }
            
    var historyControl = new OpenLayers.Control.UndoRedo([vectors]);
    map.addControl(historyControl);
    
    var measureControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path);
    map.addControl(measureControl);
    vectors.events.register("featureselected", drawControls.selectfeature, function (event) {
        console.log("featureselected", event);
        if (event.feature.geometry.CLASS_NAME.indexOf('LineString') > -1) {
            console.log('distance', measureControl.getBestLength(event.feature.geometry));
        }
        else {
            console.log('area', measureControl.getBestArea(event.feature.geometry));
        }
    });
    
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
    //document.getElementById('noneToggle').addEventListener('click', toggleControl, false);
    //document.getElementById('drawToggle').addEventListener('click', toggleControl, false);
    
    // tool switcher ui initialize
    $(".tool-radiobutton").checkboxradio({
        icon: false
    }).change(toggleControl);
    $("#map-tools").controlgroup({direction: "vertical"});
    
    $(".modify-tool-radiobutton").checkboxradio({
        icon: false
    }).change(toggleModifyControl);
    $(".tool-radiogroup").controlgroup();
    
    // undo/redo logic
    vectors.redoStack = [];
    function drawUndo() {
        console.log('undo');
        /*if (vectors.features.length) {
            var feature = vectors.features.pop();
            vectors.removeFeatures([feature]);
            vectors.redoStack.push(feature);
        }*/
        historyControl.undo();
    }
    function drawRedo() {
        /*if (vectors.redoStack.length) {
            var feature = vectors.redoStack.pop();
            vectors.addFeatures([feature]);
        }*/
        historyControl.redo();
    }
    
    // undo/redo ui listen
    $('#draw-undo').click(drawUndo);
    $('#draw-redo').click(drawRedo);
    
    $('#modify-delete').click(modifyDeleteFeature);
    
    function modifyDeleteFeature() {
        var feature = drawControls.modify.feature;
        if (feature) {
            drawControls.modify.unselectFeature(feature);
            vectors.removeFeatures([feature]);
        }
    }
    
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
    
    $('.controls-container').show();
    
    var EXPORT = (function () {
        var width = 1024,
            height = 1024;

        var x = d3.scaleLinear()
            .range([0, width]);

        var y = d3.scaleLinear()
            .range([0, height]);

        var projection = d3.geoTransform({
            point: function(px, py) {
                //console.log('px py', px, py, x(px), y(py));
                this.stream.point(x(px), height - y(py));
            }
        });

        var path = d3.geoPath()
            .projection(projection);

        var svg = d3.select("body").append("svg")
            .attr("id", "export-svg")
            .attr("width", width)
            .attr("height", height);

        var stylePropMap = {
            fillColor: 'fill',
            fillOpacity: 'fill-opacity',
            strokeColor: 'stroke',
            strokeWidth: 'stroke-width',
            strokeOpacity: 'stroke-opacity',
            graphicOpacity: 'opacity'
        }

        var imagesToLoad;
        
        function setStyle(d) {
            console.log(d.geometry.type);
            for (var p in stylePropMap) {
                if (d.properties.style[p]) {
                    console.log(p);
                    var val = d.properties.style[p];
                    if (p == 'strokeWidth') {
                        val = x(val);
                    }
                    if (p == 'fillColor' && d.geometry.type == 'LineString') val = 'none';
                    d3.select(this).style(stylePropMap[p], val);
                }
                else if (p == 'fillColor') {
                    console.log('fillColor none', d.geometry.type);
                    d3.select(this).style(stylePropMap[p], "none");
                }
                else {
                    //console.log(p);
                }
            }
            if (d.properties.style.externalGraphic) {
                console.log('imagesToLoad', imagesToLoad);
                var val = d.properties.style.externalGraphic;
                console.log('externalGraphic', val);
                var self = this;
                d3.select(this).attr("xlink:href", val)
                    .attr('x', x(d.geometry.coordinates[0]) - x(d.properties.style.graphicHeight) / 2)
                    .attr('y', height - y(d.geometry.coordinates[1]) - x(d.properties.style.graphicHeight) / 2)
                    .attr('width', x(d.properties.style.graphicHeight))
                    .attr('height', x(d.properties.style.graphicHeight));
                imagesToLoad++;
                getImageBase64(val, function (data) {
                    d3.select(self)
                        .attr("href", "data:image/png;base64," + data); // replace link by data URI
                    imagesToLoad--;
                    imageLoadFinished();
                })
            }
        }
        
        function imageLoadFinished(callback) {
            if (imagesToLoad == 0) {
                download_png();
            }
        }

        function featureFilter(e) {
            return function(d) {
                console.log(d.geometry.type);
                return d.geometry.type == e;
            }
        }
        
        function createSVG(data) {
            console.log(data);
            
            // add index of element as zIndex so they can be ordered properly later
            data.features.forEach(function (d, i) {
                d.zIndex = i;
                console.log(d);
            });
            
            var yExtent = [0, 16384],
                xExtent = [0, 16384];
            x.domain(xExtent);
            y.domain(yExtent);

            // background element
            var baseLayerName = map.baseLayer.name.replace(/ /g, '').toLowerCase();
            console.log(baseLayerName);
            var background = map_tile_path + baseLayerName + "/dotamap" + (baseLayerName == 'default' ? '' : baseLayerName) + "5_25.jpg";
            svg.append("image")
                .attr("class", "background")
                .attr("xlink:href", background)
                .attr('width', width)
                .attr('height', height);
            imagesToLoad = 1;
            getImageBase64(background, function (data) {
                d3.select(".background")
                    .attr("href", "data:image/png;base64," + data); // replace link by data URI
                imagesToLoad--;
                imageLoadFinished();
            })
                    
            svg.selectAll("g").data(data.features.filter(featureFilter('Polygon'))).enter().append("path")
                .attr("class", "node")
                .attr("d", path)
                .each(setStyle);

            svg.selectAll("g").data(data.features.filter(featureFilter('LineString'))).enter().append("path")
                .attr("class", "node")
                .attr("d", path)
                .each(setStyle);

            svg.selectAll("g").data(data.features.filter(featureFilter('Point'))).enter().append("image")
                .attr("class", "node")
                .attr("d", path)
                .each(setStyle);
                
            // sort by zIndex
            svg.selectAll(".node").sort(function (a, b) {
                console.log(a, b);
                if (a.zIndex > b.zIndex) return 1;
                if (a.zIndex < b.zIndex) return -1;
                return 0;
            });
        }
        
        function converterEngine(input) { // fn BLOB => Binary => Base64 ?
            var uInt8Array = new Uint8Array(input),
                i = uInt8Array.length;
            var biStr = []; //new Array(i);
            while (i--) {
                biStr[i] = String.fromCharCode(uInt8Array[i]);
            }
            var base64 = window.btoa(biStr.join(''));
            //console.log("2. base64 produced >>> " + base64); // print-check conversion result
            return base64;
        }

        function getImageBase64(url, callback) {
            // 1. Loading file from url:
            var xhr = new XMLHttpRequest(url);
            xhr.open('GET', url, true); // url is the url of a PNG image.
            xhr.responseType = 'arraybuffer';
            xhr.callback = callback;
            xhr.onload = function (e) {
                if (this.status == 200) { // 2. When loaded, do:
                    //console.log("1:Loaded response >>> " + this.response); // print-check xhr response 
                    var imgBase64 = converterEngine(this.response); // convert BLOB to base64
                    this.callback(imgBase64); //execute callback function with data
                }
            };
            xhr.send();
        }
        
        function download_png () {
            var contents = d3.select("svg")
                .attr("version", 1.1)
                .attr("xmlns", "http://www.w3.org/2000/svg")
                .node().outerHTML;
            var src = 'data:image/svg+xml;utf8,' + contents;
            
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext("2d");

            var image = new Image;
            image.src = src;
            image.onload = function() {
                context.drawImage(image, 0, 0, width, height);
                downloadCanvas(canvas);
            };
        }

        function dataURLtoBlob(dataurl) {
            var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], {type:mime});
        }

        function downloadCanvas(_canvasObject) {
            var link = document.createElement("a");
            var imgData = _canvasObject.toDataURL({format: 'png', multiplier: 4});
            var strDataURI = imgData.substr(22, imgData.length);
            var blob = dataURLtoBlob(imgData);
            var objurl = URL.createObjectURL(blob);

            link.download = "image.png";

            link.href = objurl;

            link.click();
        }
        
        function doExport() {
            var parser = new OpenLayers.Format.GeoJSON()
            var data = JSON.parse(parser.write(vectors.features));
            console.log(data, vectors.features);
            createSVG(data, download_png);
        }
        
        $("#export").click(doExport);
    })();
}());