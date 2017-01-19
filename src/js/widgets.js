var $ = require("jquery");
require("jquery-ui/ui/version");
require("jquery-ui/ui/safe-active-element");
require("jquery-ui/ui/widget");
require("jquery-ui/ui/escape-selector");
require("jquery-ui/ui/form-reset-mixin");
require("jquery-ui/ui/keycode");
require("jquery-ui/ui/labels");
require("jquery-ui/ui/position");
require("jquery-ui/ui/unique-id");
require("jquery-ui/ui/widgets/button");
require("jquery-ui/ui/widgets/menu");
var spinner = require("jquery-ui/ui/widgets/spinner");
var selectmenu = require("jquery-ui/ui/widgets/selectmenu");

/**************
 * UI WIDGETS *
 **************/

var formatDegree = function (value) {
    return value + '\u00B0';
}

var degreespinner = $.widget( "ui.degreespinner", $.ui.spinner, {
    _format: formatDegree,
    _parse: function(value) { return parseFloat(value); }
})

var formatPercent = function (value) {
    return value + '%';
}

var percentspinner = $.widget( "ui.percentspinner", $.ui.spinner, {
    _format: formatPercent,
    _parse: function(value) { return parseFloat(value); }
});

var iconselectmenu = $.widget("custom.iconselectmenu", $.ui.selectmenu, {
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

module.exports = {
    formatDegree: formatDegree,
    degreespinner: degreespinner,
    formatPercent: formatPercent,
    percentspinner: percentspinner,
    iconselectmenu: iconselectmenu
};