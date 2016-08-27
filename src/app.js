import $ from 'jquery';
import dialog from 'jquery-ui/ui/widgets/dialog';
import spinner from 'jquery-ui/ui/widgets/spinner';
import selectmenu from 'jquery-ui/ui/widgets/selectmenu';
import checkboxradio from 'jquery-ui/ui/widgets/checkboxradio';
import controlgroup from 'jquery-ui/ui/widgets/controlgroup';
import tooltip from 'jquery-ui/ui/widgets/tooltip';
import CP from 'exports?CP!./color-picker.js';
import OpenLayers from 'exports?OpenLayers!../ol2/build/OpenLayers.js';
import UndoRedo from './OpenLayers.Control.UndoRedo';
import {getParameterByName, setQueryString} from "./querystringutil";
import {latLonToWorld, worldToLatLon, calculateDistance} from "./coordinateconversion";
import CustomLayerSwitcher from "./layerswitcher";
import {formatDegree, formatPercent} from "./widgets";
import ExportMap from "./exportmap";
import ShareMap from "./sharemap";
import SaveMap from "./savemap";

console.log('ExportMap', ExportMap);

    var IMG_DIR = "images/",
        map_data_path = "data.json",
        map_tile_path = "/media/images/map/687/",
        map_w = 16384,
        map_h = 16384,
        map_x_boundaries = [-8475.58617377, 9327.49124559],
        map_y_boundaries = [9028.52473332, -8836.61406266],
        scale = Math.abs(map_x_boundaries[1] - map_x_boundaries[0])/map_w,
        imageToDota = latLonToWorld.bind(null, map_x_boundaries, map_y_boundaries, map_w, map_h),
        dotaToImage = worldToLatLon.bind(null, map_x_boundaries, map_y_boundaries, map_w, map_h),
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
        layerSwitcher = new CustomLayerSwitcher({
            ascending: false
        }, function (evt) {
            var button = evt.buttonElement;
            if (button === this.maximizeDiv) {
                OpenLayers.Element.removeClass(this.div, "minimized");
                if (isSmallScreen()) {
                    minimizeControlList();
                }
            }
        }),
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
        strokeTools = ['brush', 'line', 'polygon', 'regularpolygon'],
        activeTool,
        renderer = OpenLayers.Util.getParameters(window.location.href).renderer,
        saveHandlerUrl = 'save.php';

    
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
                    /*if (key == 'modify') {
                        vectors.events.register("beforefeaturemodified", drawControls[key], onBeforeFeatureModified);
                        vectors.events.register("afterfeaturemodified", drawControls[key], onFeatureModified);
                    }
                    else {
                        vectors.events.register("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
                    }*/
                }
            } else {
                control.deactivate();
                if (tools.indexOf(key) != -1) {
                    /*if (key == 'modify') {
                        vectors.events.unregister("beforefeaturemodified", drawControls[key], onBeforeFeatureModified);
                        vectors.events.unregister("afterfeaturemodified", drawControls[key], onFeatureModified);
                    }
                    else {
                        vectors.events.unregister("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
                    }*/
                }
            }
        }
        if (this.value == 'modify') {
            console.log("layer selected features", vectors.selectedFeatures);
            if (vectors.selectedFeatures.length) {
                drawControls.modify.selectFeature(vectors.selectedFeatures[0]);
            }
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
            var lonlat = dotaToImage(worldX, worldY);
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
        
        var $markerList = $('#marker-list');
        $( "#marker-image-dropdown" ).iconselectmenu({
            change: function( event, ui ) {
                console.log('change', event, ui);
                defaultStyles.icon.externalGraphic = ui.item.value;
                var iconClass = ui.item.element.attr("data-class");
                console.log('iconClass', iconClass);
                var bInList = false;
                $markerList.children().each(function (i) {
                    if ($(this).hasClass(iconClass)) {
                        console.log('hasClass');
                        $(this).prependTo('#marker-list');
                        bInList = true;
                        return false;
                    }
                });
                if (bInList) return;
                
                addIcon(iconClass, ui.item.value);
                
                var len = $markerList.children().length;
                while (len > 10) {
                    $('div:last-child', $markerList).remove();
                    len--;
                }
            }
        });
        
        function addIcon(iconClass, value) {
            var $icon = $('<div>')
                .addClass("selectmenu-icon " + iconClass);
            $icon.click(function () {
                console.log('click', value);
                defaultStyles.icon.externalGraphic = value;
                $('#marker-image-dropdown').val(value).iconselectmenu( "refresh" );
            });
            $markerList.prepend($icon);
        }
        
        defaultStyles.icon.externalGraphic = $('#marker-image-dropdown > option')[0].value;
        addIcon($('#marker-image-dropdown > option').attr("data-class"), defaultStyles.icon.externalGraphic);
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
    for (var k in defaultStyles) {
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
        var worldXY = imageToDota(lonlat.lon, lonlat.lat);
        return worldXY.x.toFixed(0) + ', ' + worldXY.y.toFixed(0);
    };
    map.addControl(coordinateControl);
    
    map.addControl(new OpenLayers.Control.TouchNavigation({
        dragPanOptions: {
            enableKinetic: true
        }
    }));
    map.addControl(new OpenLayers.Control.KeyboardDefaults());
    map.addControl(layerSwitcher);
    layerSwitcher.maximizeControl();
    if (!map.getCenter()) {
        map.zoomToMaxExtent();
    }

    // Controls configuration
    var drawControls = {
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
        displayMeasure(document.getElementById('measure-distance'), event.order, event.units, event.measure);
    }
    
    function displayMeasure(element, order, units, measure) {
        console.log('displayMeasure(element, order, units, measure)', element, order, units, measure);
        var val = calculateDistance(scale, order, units, measure);
        var out = "";
        if(order == 1) {
            out += val.toFixed(0) + " units";
        } else {
            out += val.toFixed(0) + " units<sup>2</" + "sup>";
        }
        element.value = out;
    }
    
    function createSketchCompletedHandler(key) {
        return function (event) {
            if (drawControls[key].active) {
                console.log('createSketchCompletedHandler', key);
                //event.feature.attributes.renderIntent = key;
                //event.feature.renderIntent = key;
                event.feature.attributes.style = getStyle(key);
            }
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
        console.log("onFeatureModified");
        document.getElementById('draw-undo').disabled = false;
        document.getElementById('draw-redo').disabled = false;
        
    }
    function onBeforeFeatureModified(event) {
        console.log("onBeforeFeatureModified");
        document.getElementById('draw-undo').disabled = true;
        document.getElementById('draw-redo').disabled = true;
    }

    // Add controls to map
    for (var key in drawControls) {
        map.addControl(drawControls[key]);
        if (key == 'modify') {
            vectors.events.register("beforefeaturemodified", drawControls[key], onBeforeFeatureModified);
            vectors.events.register("afterfeaturemodified", drawControls[key], onFeatureModified);
        }
        else {
            vectors.events.register("sketchcomplete", drawControls[key], onSketchCompletedHandlers[key]);
        }
    }
            
    var historyControl = new UndoRedo([vectors]);
    map.addControl(historyControl);
            
    var exportControl = new ExportMap(map, vectors, document.getElementById('export'), map_tile_path);
    map.addControl(exportControl);
            
    var shareControl = new ShareMap(map, vectors, document.getElementById('share'), map_tile_path);
    map.addControl(shareControl);
            
    var saveControl = new SaveMap(map, vectors, document.getElementById('save'), saveHandlerUrl);
    map.addControl(saveControl);
    
    var measureControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path);
    map.addControl(measureControl);
    vectors.events.register("featureselected", drawControls.selectfeature, function (event) {
        console.log("featureselected", event);
        if (event.feature.geometry.CLASS_NAME.indexOf('LineString') > -1) {
            var data = measureControl.getBestLength(event.feature.geometry)
            console.log('distance', data);
            displayMeasure(document.getElementById('selectfeature-distance'), 1, data[1], data[0]);
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
        var worldXY = imageToDota(map.center.lon, map.center.lat);
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
        drawControls.selectfeature.unselectAll();
        historyControl.undo();
    }
    function drawRedo() {
        drawControls.selectfeature.unselectAll();
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
    
    // start jquery ui tooltips
    $( document ).tooltip();
    
    parseQueryString();
    
    $('.controls-container').show();
    
    $(".link-modal").dialog({
        autoOpen: false,
        modal: true,
        width: 'auto',
        buttons: {
            Ok: function() {
                $( this ).dialog( "close" );
            }
        }
    });