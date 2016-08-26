import OpenLayers from 'exports?OpenLayers!../ol2/build/OpenLayers.js';

export default OpenLayers.Class(OpenLayers.Control.LayerSwitcher, {
    
    onButtonClickCallback: null,
    
    initialize: function(options, onButtonClickCallback) {
        OpenLayers.Control.LayerSwitcher.prototype.initialize.apply(this, arguments);
        this.onButtonClickCallback = onButtonClickCallback;
    },
    
    onButtonClick: function(evt) {
        if (this.onButtonClickCallback) this.onButtonClickCallback(evt);
        return OpenLayers.Control.LayerSwitcher.prototype.onButtonClick.apply(this, arguments);
    },
    
    maximizeControl: function(e) {
        OpenLayers.Element.removeClass(this.div, "minimized");
        
        this.showControls(false);

        if (e != null) {
            OpenLayers.Event.stop(e);
        }
    },

    minimizeControl: function(e) {
        OpenLayers.Element.addClass(this.div, "minimized");

        this.showControls(true);

        if (e != null) {
            OpenLayers.Event.stop(e);
        }
    },
    
    loadContents: function() {

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
        this.maximizeDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.maximizeDiv, "OpenLayers_Control_MaximizeDiv maximizeDiv olButton");
        this.maximizeDiv.style.display = "none";

        this.div.appendChild(this.maximizeDiv);

        // minimize button div
        this.minimizeDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.minimizeDiv, "OpenLayers_Control_MinimizeDiv minimizeDiv olButton");
        this.minimizeDiv.style.display = "none";

        this.minimizeDiv.innerHTML = '&times;';		
        
        var bars = document.createElement("i");
        OpenLayers.Element.addClass(bars, "fa fa-bars");
        this.maximizeDiv.appendChild(bars);
        
        this.div.appendChild(this.minimizeDiv);
    },
    
    CLASS_NAME : "OpenLayers.Control.LayerSwitcher"
});