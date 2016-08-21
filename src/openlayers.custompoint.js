/* Copyright (c) 2006-2015 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */


/**
 * @requires OpenLayers/Handler.js
 * @requires OpenLayers/Geometry/Point.js
 */

/**
 * Class: OpenLayers.Handler.Point
 * Handler to draw a point on the map. Point is displayed on activation,
 *     moves on mouse move, and is finished on mouse up. The handler triggers
 *     callbacks for 'done', 'cancel', and 'modify'. The modify callback is
 *     called with each change in the sketch and will receive the latest point
 *     drawn.  Create a new instance with the <OpenLayers.Handler.Point>
 *     constructor.
 * 
 * Inherits from:
 *  - <OpenLayers.Handler>
 */
OpenLayers.Handler.CustomPoint = OpenLayers.Class(OpenLayers.Handler.Point, {

    /**
     * Method: drawFeature
     * Render features on the temporary layer.
     */
    drawFeature: function() {
        this.point.attributes.style = this.style;
        this.layer.drawFeature(this.point);
    },

    CLASS_NAME: "OpenLayers.Handler.CustomPoint"
});