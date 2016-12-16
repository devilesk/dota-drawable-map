var OpenLayers = require("../ol2/build/OpenLayers.js");
console.log(OpenLayers);
/**
 * Class: OpenLayers.Control.UndoRedo
 * Instance of this class can be used to undo and redo vector edits.
 */
 
module.exports = OpenLayers.Class(OpenLayers.Control, {
	/**
	 * APIProperty: currentEditIndex
	 * {integer} - sequence number for editing the feature[s] 
	 */
	currentEditIndex: 0,
	/**
	 * Property: undoFeatures
	 * {array} - stack of the edit features
	 */
	undoFeatures: [],
	/**
	 * Property: redoFeatures
	 * {array} - stack of the undo features
	 */
	redoFeatures: [],
	/**
	 * Property: isEditMulty
	 * {boolean} - true if in one action multiple features are edited 
	 */
	isEditMulty: false,
	
	/**
	 * constructor: UndoRedo
	 * Parameters:
	 * layers - array of {<OpenLayers.Layers.Vector>}
	 */
	initialize: function (layers) {
        console.log('initialize', this, layers);
		if (!(layers instanceof Array)) {
			layers = [layers];
		}
		for(var i = 0; i < layers.length; i++) {
            console.log('registering handlers');
            layers[i].events.register("sketchstarted", this, this.onSketchStarted);
			layers[i].events.register("featureadded", this, this.onInsert);
            layers[i].events.register("beforefeatureremoved", this, this.onDelete);
            layers[i].events.register("beforefeaturemodified", this, this.onUpdate);
            layers[i].events.register("afterfeaturemodified", this, this.onUpdateCompleted);
		}
	},
    
	/**
	 * Method: onEdit
	 * on any edit operation performed this has to be triggered
	 * i.e. on insert, delete, update 
	 * Parameters: 
	 * feature - {<OpenLayers.Feature.Vector>}
	 * editType - {string} edit type done "Insert","Delete","Update"
	 * component - {string} layer or any other identifier
	 * Returns: 
	 */	 
	onEdit: function (feature, editType, component) {
		console.log("Updating undo stack as there is - " + editType, feature, component);
		if (component == undefined) {
			component = feature.layer.name;
		}
		if (this.undoFeatures[this.currentEditIndex] == undefined) {
			this.undoFeatures[this.currentEditIndex] = {};
			this.undoFeatures[this.currentEditIndex][component] = {"Insert": [], "Update": [], "Delete": []};
		}
		if (feature.fid == undefined) {
			feature.fid = feature.id;
		}	
		this.undoFeatures[this.currentEditIndex][component][editType].push(feature);
		this.redoFeatures.splice(0, this.redoFeatures.length);
	},
	
	/** 
	 * Method: onSketchStarted
	 * event handler for sketchstarted
	 */
	onSketchStarted: function (event) {
		this.increaseEditIndex();
		console.log("currentEditIndex: " + this.currentEditIndex);
		return true;
	},
	
	/**
	 * Method: onInsert
	 * event handler for featureadded 
	 */
	onInsert: function (event) {	
		var feature = event.feature.clone();
		if (event.feature.fid == undefined) {
			event.feature.fid = event.feature.id;
		}
		feature.fid = event.feature.fid;
		feature.state = event.feature.state;
		feature.layer = event.feature.layer;
		this.onEdit(feature, "Insert", feature.layer.name);
        return true;
	},
	
	/**
	 * Method: onDelete
	 * event handler for beforefeatureremoved 
	 */
	onDelete: function (event) {
        this.increaseEditIndex();
		this.onEdit(event.feature, "Delete", event.feature.layer.name);
        return true;
	},
	
	/**
	 * Method: onUpdate
	 * event handler for beforefeaturemodified
	 */
	onUpdate: function (event) {
        this.increaseEditIndex();
		console.log("old feature geometry: ", event.feature.geometry);
		var feature = event.feature.clone();
		feature.fid = event.feature.fid;
		feature.state = event.feature.state;
		feature.layer = event.feature.layer;
		this.onEdit(feature, "Update", feature.layer.name);
	},
	
	/**
	 * Method: onUpdateCompleted
	 * event handler for afterfeaturemodified
	 */
	onUpdateCompleted: function (event) {
        console.log("onUpdateCompleted", event.modified);
        if (!event.modified) {
            this.getUndoData();
        }
	},
	
	/**
	 * Method: increaseEditIndex
	 * increase the editIndex
	 */
	increaseEditIndex: function () {
		if (this.currentEditIndex < this.undoFeatures.length ) {
        	this.currentEditIndex += 1;
        }
	},
	
	/**
	 * Method: getUndoData
	 * returns the last edited data
	 */ 
	getUndoData: function () {
		var data = this.undoFeatures.pop();
        if (data) {
            this.currentEditIndex -= 1;
        }
		return data;
	},
	
	/**
     * Method: getRedoData
	 * returns the last redo data
	 */
	getRedoData: function() {
		var data = this.redoFeatures.pop();
        if (data) {
            this.currentEditIndex += 1;
        }
		return data;
	},
	
	/**
	 * APIMethod: resetEditIndex
	 * reset the editIndex to 0 and empty both undo and redo stack
	 */
	resetEditIndex: function () {
		this.currentEditIndex = 0;
		this.undoFeatures.splice(0, this.undoFeatures.length);
		this.redoFeatures.splice(0, this.redoFeatures.length);
	},
	
	/**
	 * APIMethod: undo
	 * perform undo operation 
	 */
	undo: function () {	
		var data = this.getUndoData();
		console.log("undo data :", data);
        if (data) {
            for (var component in data) {
                console.log("component: " + component);
                var layer = this.map.getLayersByName(component)[0];
                console.log("got layer, name: " + layer.name);
                for (var editType in data[component]) {
                    console.log("editType : " + editType);
                    for (var i = 0; i < data[component][editType].length;i++) {
                        var feature = data[component][editType][i];
                        console.log("features before undo: " + layer.features.length, feature);
                        switch (editType) {
                            case "Insert":
                                //layer.drawFeature(feature, {display : "none"});
                                var insertedFeature = layer.getFeatureByFid(feature.fid);
                                console.log("undo Insert", insertedFeature, feature, feature.fid);
                                layer.eraseFeatures(insertedFeature);
                                console.log('after erase', insertedFeature, layer.features.length);
                                OpenLayers.Util.removeItem(layer.features, insertedFeature);
                                console.log('OpenLayers.Util.removeItem', insertedFeature, layer.features.length);
                                break;
                            case "Delete":
                                console.log("undo Delete", feature);
                                // layer.features.push(feature);
                                // layer.drawFeature(feature);
                                layer.addFeatures([feature], {silent: true});
                                break;
                            case "Update":
                                console.log("undo Update");
                                var updatedFeature = layer.getFeatureByFid(feature.fid);
                                console.log("old feature geometry: ", feature.geometry);
                                console.log("updated feature geometry: ", updatedFeature.geometry);
                                //layer.drawFeature(updatedFeature, {display : "none"});
                                layer.eraseFeatures(updatedFeature);
                                OpenLayers.Util.removeItem(layer.features, updatedFeature);						
                                //layer.removeFeatures(updatedFeature);
                                console.log("old feature geometry: " + feature.geometry);
                                //layer.features.push(feature);
                                //layer.drawFeature(feature);
                                layer.addFeatures([feature], {silent: true});
                                data[component][editType][i] = updatedFeature;
                                break;
                            default:
                                console.log("unknown");
                                break;				
                        }
                        console.log("features after undo: " + layer.features.length, feature);
                    }
                }
            }
            this.redoFeatures.push(data);
        }
	},
	
	/**
	 * APIMethod:  redo
	 * perform redo operation
	 */
	redo: function () {
		var data = this.getRedoData();
        console.log("redo data :", data);
        if (data) {
            for (var component in data) {
                console.log("component: " + component);
                var layer = this.map.getLayersByName(component)[0];
                console.log("got layer, name: " + layer.name);
                for (var editType in data[component]) {
                    console.log("editType : " + editType);
                    for (var i = 0; i < data[component][editType].length; i++) {
                        var feature = data[component][editType][i];
                        console.log("features before redo: " + layer.features.length);	
                        switch (editType) {
                            case "Insert":
                                console.log("redo Insert", feature);
                                // layer.features.push(feature);
                                // layer.drawFeature(feature);
                                layer.addFeatures([feature], {silent: true});
                                break;
                            case "Delete":
                                console.log("redo Delete");
                                var deleteFeature = layer.getFeatureByFid(feature.fid)
                                layer.eraseFeatures(deleteFeature);
                                OpenLayers.Util.removeItem(layer.features, deleteFeature);	
                                break;
                            case "Update":
                                console.log("redo Update");
                                var oldFeature = layer.getFeatureByFid(feature.fid);
                                console.log("old feature id: " + oldFeature.id);
                                layer.eraseFeatures(oldFeature);
                                OpenLayers.Util.removeItem(layer.features, oldFeature);
                                console.log("updated feature id: " + oldFeature.id);
                                //layer.features.push(feature);
                                //layer.drawFeature(feature);
                                layer.addFeatures([feature], {silent: true});
                                data[component][editType][i] = oldFeature;
                                break;
                            default:
                                break; 
                        }
                    }
                }
            }
            this.undoFeatures.push(data);
        }
	},

	CLASS_NAME : "OpenLayers.Control.UndoRedo"
});