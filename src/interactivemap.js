(function() {
    var IMG_DIR = "img/",
        ENTITIES = {
            observer: {
                icon_path: IMG_DIR + "ward_observer.png",
                radius: 1600
            },
            sentry: {
                icon_path: IMG_DIR + "ward_sentry.png",
                radius: 850
            }
        },
        TOWER_DAY_VISION_RADIUS = 1900,
        TOWER_NIGHT_VISION_RADIUS = 800,
        TOWER_TRUE_SIGHT_RADIUS = 900,
        TOWER_ATTACK_RANGE_RADIUS = 700,
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
        layerNames = {
            npc_dota_roshan_spawner: "Roshan",
            dota_item_rune_spawner: "Runes",
            ent_dota_tree: "Trees",
            npc_dota_fort: "Ancients",
            ent_dota_shop: "Shops",
            npc_dota_tower: "Towers",
            npc_dota_barracks: "Barracks",
            npc_dota_building: "Buildings",
            trigger_multiple: "Neutral Camps Spawn Boxes",
            npc_dota_neutral_spawner: "Neutral Camps",
            trigger_no_wards: "Invalid Ward Locations",
            ent_fow_blocker_node: "Vision Blocker"
        },
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
        drawControls,
        lastDistance,
        style = {
            lightblue: {
                strokeColor: "#007FFF",
                strokeOpacity: 1,
                strokeWidth: 1,
                fillColor: "#007FFF",
                fillOpacity: .4
            },
            red: {
                strokeColor: "#FF0000",
                strokeOpacity: 1,
                strokeWidth: 1,
                fillColor: "#FF0000",
                fillOpacity: .4
            },
            green: {
                strokeColor: "#00FF00",
                strokeOpacity: 1,
                strokeWidth: 1,
                fillColor: "#00FF00",
                fillOpacity: .4
            },
            yellow: {
                strokeColor: "#FFFF00",
                strokeOpacity: 1,
                strokeWidth: 1,
                fillColor: "#FFFF00",
                fillOpacity: .4
            }
        },
        treeMarkers = {};

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

        for (var key in drawControls) {
            control = drawControls[key];
            if (this.value == key && this.checked) {
                control.activate();
                if (key == 'icon') {
                    console.log('icon styles', drawControls.icon.style);
                }
            } else {
                control.deactivate();
            }
        }
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
        
        var keys = ['observer', 'sentry'];
        for (var i = 0; i < keys.length; i++) {
            var wards = getParameterByName(keys[i])
            if (wards) {
                ward_coordinates = trim(wards, ' ;').split(';')
                ward_coordinates.map(function(el) {
                    var coord = el.split(',');
                    var xy = worldToLatLon(parseFloat(coord[0]), parseFloat(coord[1]));
                    placeWard(new OpenLayers.LonLat(xy.x, xy.y), keys[i], el);
                });
            }
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
        
        for (k in layerNames) {
            var layerName = layerNames[k].replace(/ /g, '');
            value = getParameterByName(layerName);
            if (value) {
                var layer = map.getLayersByName(layerNames[k])[0];
                console.log(layer, layerNames[k], layerName);
                layer.setVisibility(value == "true");
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
    var context = {
        getStrokeWidth: function(feature) {
            if (!feature.attributes.style) return 0;
            return feature.attributes.style.strokeWidth / map.getResolution();
        },
        getStrokeColor: function(feature) {
            if (!feature.attributes.style) return '';
            return feature.attributes.style.strokeColor;
        },
        getStrokeOpacity: function(feature) {
            if (!feature.attributes.style) return 1;
            return feature.attributes.style.strokeOpacity;
        },
        getGraphicHeight: function(feature) {
            if (!feature.attributes.style) return 1;
            return feature.attributes.style.graphicHeight / map.getResolution();
        },
        getGraphicOpacity: function(feature) {
            if (!feature.attributes.style) return 1;
            return feature.attributes.style.graphicOpacity;
        },
        getGraphicYOffset: function(feature) {
            if (!feature.attributes.style) return 1;
            switch (feature.attributes.style.externalGraphic) {
                case './img/ward_sentry.png':
                case './img/ward_observer.png':
                    return -feature.attributes.style.graphicHeight / map.getResolution();
                break;
                default:
                    return -feature.attributes.style.graphicHeight / 2 / map.getResolution();
                break;
            }
        },
        getExternalGraphic: function(feature) {
            if (!feature.attributes.style || !feature.attributes.style.externalGraphic) return '';
            return feature.attributes.style.externalGraphic;
        }
    };
    var template = {
        strokeWidth: "${getStrokeWidth}",
        strokeColor: "${getStrokeColor}",
        strokeOpacity: "${getStrokeOpacity}",
        graphicOpacity: "${getGraphicOpacity}",
        externalGraphic: "${getExternalGraphic}",
        graphicYOffset: "${getGraphicYOffset}",
        graphicHeight: "${getGraphicHeight}"
    };
    var style = new OpenLayers.Style(template, {context: context});
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
            if (button === this.maximizeDiv && isSmallScreen()) {
                minimizeControlList.call(document.getElementById("controls-min"));
            }
            return fn.apply(this, arguments);
        }
    })(layerSwitcher.onButtonClick);
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
                                    "absolute");
        OpenLayers.Element.addClass(this.maximizeDiv, "maximizeDiv olButton");
        this.maximizeDiv.style.display = "none";

        this.div.appendChild(this.maximizeDiv);

        // minimize button div
        this.minimizeDiv = OpenLayers.Util.createAlphaImageDiv(
                                    "OpenLayers_Control_MinimizeDiv",
                                    null,
                                    null,
                                    null,
                                    "absolute");
        OpenLayers.Element.addClass(this.minimizeDiv, "minimizeDiv olButton");
        this.minimizeDiv.style.display = "none";

        this.maximizeDiv.innerHTML = '&equiv;';
        this.minimizeDiv.innerHTML = '&times;';
        
        this.div.appendChild(this.minimizeDiv);
    }
    console.log(layerSwitcher.onButtonClick);
    map.addControl(layerSwitcher);
    layerSwitcher.maximizeControl();
    if (!map.getCenter()) {
        map.zoomToMaxExtent();
    }

    // Controls configuration
    drawControls = {
        drag: new OpenLayers.Control.CustomDrawFeature(vectors, OpenLayers.Handler.CustomPath),
        icon: new OpenLayers.Control.CustomDrawFeature(vectors, OpenLayers.Handler.CustomPoint)
        //icon: new OpenLayers.Control.Click(vectors)
    };
    drawControls.drag.setStyle({
        strokeWidth: 5,
        strokeColor: '#ff0000'
    });
    drawControls.icon.setStyle({
        externalGraphic: document.getElementById('icon-image').value,
        graphicHeight: document.getElementById('icon-size').value,
        graphicOpacity: document.getElementById('icon-opacity').value
    });
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
        document.querySelector(".controls").style.display = '';
        document.getElementById("controls-min").style.display = 'block';
        this.style.display = 'none';
        if (isSmallScreen()) {
            layerSwitcher.minimizeControl();
        }
        if (e) e.preventDefault();
    }, false);
    function minimizeControlList(e) {
        document.querySelector(".controls").style.display = 'none';
        document.getElementById("controls-max").style.display = 'block';
        this.style.display = 'none';
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
    document.getElementById('dragToggle').addEventListener('click', toggleControl, false);
    document.getElementById('iconToggle').addEventListener('click', toggleControl, false);

    document.getElementById('icon-image').addEventListener('change', function () {
        drawControls.icon.setStyle({externalGraphic: this.value});
    }, false);
    
    document.getElementById('stroke-width').addEventListener('change', function () {
        console.log('stroke-width', parseInt(this.value));
        var v = parseInt(this.value);
        if (isNaN(v)) {
            this.value = drawControls.drag.style.strokeWidth;
        }
        else {
            drawControls.drag.setStyle({strokeWidth: v});
        }
    }, false);
    
    document.getElementById('stroke-opacity').addEventListener('change', function () {
        console.log('stroke-opacity', parseFloat(this.value));
        var v = parseFloat(this.value);
        if (isNaN(v)) {
            this.value = drawControls.drag.style.strokeOpacity;
        }
        else {
            drawControls.drag.setStyle({strokeOpacity: v});
        }
        var parser = new OpenLayers.Format.GeoJSON()
        console.log(vectors);
        console.log(parser.write(vectors.features));
    }, false);
    
    document.getElementById('icon-opacity').addEventListener('change', function () {
        console.log('icon-opacity', parseFloat(this.value));
        var v = parseFloat(this.value);
        if (isNaN(v)) {
            this.value = drawControls.icon.style.graphicOpacity;
        }
        else {
            drawControls.icon.setStyle({graphicOpacity: v});
        }
        var parser = new OpenLayers.Format.GeoJSON()
        console.log(vectors);
        console.log(parser.write(vectors.features));
    }, false);
    
    document.getElementById('icon-size').addEventListener('change', function () {
        console.log('icon-size', parseFloat(this.value));
        var v = parseFloat(this.value);
        if (isNaN(v)) {
            this.value = drawControls.icon.style.graphicHeight;
        }
        else {
            drawControls.icon.setStyle({graphicHeight: v});
        }
        var parser = new OpenLayers.Format.GeoJSON()
        console.log(vectors);
        console.log(parser.write(vectors.features));
    }, false);
    
    var colorPreview = document.getElementById('color-preview');
    var picker = new CP(document.getElementById('color-picker'));
    picker.on("enter", function() {
        var color = '#' + this._HSV2HEX(this.set());
        colorPreview.title = color;
        colorPreview.style.color = color;
    });
    picker.on("change", function(color) {
        this.target.value = '#' + color;
        colorPreview.style.color = '#' + color;
        drawControls.drag.setStyle({strokeColor: '#' + color});
    });
    picker.on("exit", function() {
        this.target.value = colorPreview.title;
    });
    
    var x = document.createElement('a');
        x.href = 'javascript:;';
        x.innerHTML = 'Close Me!';
        x.addEventListener("click", function() {
            picker.exit();
        }, false);
    picker.picker.appendChild(x);
}());