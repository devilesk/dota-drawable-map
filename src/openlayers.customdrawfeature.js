/* Copyright (c) 2006-2015 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */


/**
 * @requires OpenLayers/Control.js
 * @requires OpenLayers/Feature/Vector.js
 */

/**
 * Class: OpenLayers.Control.DrawFeature
 * The DrawFeature control draws point, line or polygon features on a vector
 * layer when active.
 *
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.CustomDrawFeature = OpenLayers.Class(OpenLayers.Control.DrawFeature, {

    /**
     * Method: drawFeature
     */
    drawFeature: function(geometry) {
        console.log('customdrawfeature', geometry);
        var feature = new OpenLayers.Feature.Vector(geometry);
        feature.attributes.style = this.style;
        var proceed = this.layer.events.triggerEvent(
            "sketchcomplete", {feature: feature}
        );
        if(proceed !== false) {
            feature.state = OpenLayers.State.INSERT;
            this.layer.addFeatures([feature]);
            this.featureAdded(feature);
            this.events.triggerEvent("featureadded",{feature : feature});
        }
    },
    
    setStyle: function (style, no_merge) {
        if (!no_merge) {
            var style = OpenLayers.Util.applyDefaults(style, this.style);
        }
        else {
            var style = OpenLayers.Util.applyDefaults(style, {});
        }
        this.handler.style = style;
        this.style = style;
    },

    CLASS_NAME: "OpenLayers.Control.CustomDrawFeature"
});