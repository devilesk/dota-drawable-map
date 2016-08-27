import $ from 'jquery';
import spinner from 'jquery-ui/ui/widgets/spinner';
import selectmenu from 'jquery-ui/ui/widgets/selectmenu';

/**************
 * UI WIDGETS *
 **************/

export function formatDegree(value) {
    return value + '\u00B0';
}

var degreespinner = $.widget( "ui.degreespinner", $.ui.spinner, {
    _format: formatDegree,
    _parse: function(value) { return parseFloat(value); }
})

export function formatPercent(value) {
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

export {degreespinner, percentspinner, iconselectmenu};