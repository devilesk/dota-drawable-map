var CustomDragControl = OpenLayers.Class(OpenLayers.Control, {

    defaultHandlerOptions: {
        'stopDown': false
        /* important, otherwise it prevent the click-drag event from 
           triggering the normal click-drag behavior on the map to pan it */
    },

    initialize: function(layer, options) {
        this.layer = layer;
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions
        );
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        ); 
        this.handler = new OpenLayers.Handler.CustomPath(
            this, {
                'down': this.onDown, //could be also 'move', 'up' or 'out'
                done: function(geometry) {
                    console.log('done', geometry);
                },
                modify: function(vertex, feature) {
                    console.log('modify', vertex, feature);
                },
                create: function(vertex, feature) {
                    console.log('create', vertex, feature);
                }
            }, this.handlerOptions
        );
    }, 

    onDown: function(evt) {
        // do something when the user clic on the map (so on drag start)
        console.log('user clicked down on the map', this.layer);
    }
});