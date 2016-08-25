/***********************************
 * COORDINATE CONVERSION FUNCTIONS *
 ***********************************/

export function getTileRadius(r) {
    return parseInt(Math.floor(r / 64));
}

export function lerp(minVal, maxVal, pos_r) {
    return pos_r * (maxVal - minVal) + minVal;
}

export function reverseLerp(minVal, maxVal, pos) {
    return (pos - minVal) / (maxVal - minVal);
}

export function latLonToWorld(map_x_boundaries, map_y_boundaries, map_w, map_h, x, y) {
    var x_r = lerp(map_x_boundaries[0], map_x_boundaries[1], x / map_w),
        y_r = lerp(map_y_boundaries[0], map_y_boundaries[1], (map_h - y) / map_h);

    return {
        x: x_r,
        y: y_r
    };
}

export function worldToLatLon(map_x_boundaries, map_y_boundaries, map_w, map_h, x_r, y_r) {
    var x = reverseLerp(map_x_boundaries[0], map_x_boundaries[1], x_r) * map_w,
        y = map_h - reverseLerp(map_y_boundaries[0], map_y_boundaries[1], y_r) * map_h;

    return {
        x: x,
        y: y
    };
}

export function getScaledRadius(map_x_boundaries, map_w, r) {
    return r / (map_x_boundaries[1] - map_x_boundaries[0]) * map_w
}

export function calculateDistance(scale, order, units, measure) {
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