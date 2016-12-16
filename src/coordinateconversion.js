/***********************************
 * COORDINATE CONVERSION FUNCTIONS *
 ***********************************/

var getTileRadius = function (r) {
    return parseInt(Math.floor(r / 64));
}

var lerp = function (minVal, maxVal, pos_r) {
    return pos_r * (maxVal - minVal) + minVal;
}

var reverseLerp = function (minVal, maxVal, pos) {
    return (pos - minVal) / (maxVal - minVal);
}

var latLonToWorld = function (map_x_boundaries, map_y_boundaries, map_w, map_h, x, y) {
    var x_r = lerp(map_x_boundaries[0], map_x_boundaries[1], x / map_w),
        y_r = lerp(map_y_boundaries[0], map_y_boundaries[1], (map_h - y) / map_h);

    return {
        x: x_r,
        y: y_r
    };
}

var worldToLatLon = function (map_x_boundaries, map_y_boundaries, map_w, map_h, x_r, y_r) {
    var x = reverseLerp(map_x_boundaries[0], map_x_boundaries[1], x_r) * map_w,
        y = map_h - reverseLerp(map_y_boundaries[0], map_y_boundaries[1], y_r) * map_h;

    return {
        x: x,
        y: y
    };
}

var getScaledRadius = function (map_x_boundaries, map_w, r) {
    return r / (map_x_boundaries[1] - map_x_boundaries[0]) * map_w
}

var calculateDistance = function (scale, order, units, measure) {
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

module.exports = {
    getTileRadius: getTileRadius,
    lerp: lerp,
    reverseLerp: reverseLerp,
    latLonToWorld: latLonToWorld,
    worldToLatLon: worldToLatLon,
    getScaledRadius: getScaledRadius,
    calculateDistance: calculateDistance
}