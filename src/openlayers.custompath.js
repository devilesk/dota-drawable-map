/* Copyright (c) 2006-2015 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */


/**
 * @requires OpenLayers/Handler/Point.js
 * @requires OpenLayers/Geometry/Point.js
 * @requires OpenLayers/Geometry/LineString.js
 */

/**
 * Class: OpenLayers.Handler.Path
 * Handler to draw a path on the map.  Path is displayed on mouse down,
 * moves on mouse move, and is finished on mouse up.
 *
 * Inherits from:
 *  - <OpenLayers.Handler.Point>
 */
OpenLayers.Handler.CustomPath = OpenLayers.Class(OpenLayers.Handler.Path, {
 
    /**
     * Property: freehand
     * {Boolean} In freehand mode, the handler starts the path on mouse down,
     * adds a point for every mouse move, and finishes the path on mouse up.
     * Outside of freehand mode, a point is added to the path on every mouse
     * click and double-click finishes the path.
     */
    freehand: true,

    /**
     * Method: drawFeature
     * Render geometries on the temporary layer.
     */
    drawFeature: function() {
        this.line.attributes.style = this.style;
        this.point.attributes.style = this.style;
        this.layer.drawFeature(this.line);
        this.layer.drawFeature(this.point);
    },

    CLASS_NAME: "OpenLayers.Handler.CustomPath"
});