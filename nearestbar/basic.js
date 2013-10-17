if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments[0];
    return this.replace(/{(\w+)}/g, function(match, key) { 
      return ((typeof args[key] !== undefined) && (args[key] !== null))
        ? convert(args[key])
        : '&nbsp;'
      ;
    });
  };
}
function convert(value){
    var time = parseInt(value);
    if (time > 631152000) {
        return new Date(time).toLocaleDateString();
    } else {
        return value;
    }    
}

define([
    "dojo/ready", 
    "dojo/on",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "esri/arcgis/utils",
    "esri/dijit/LocateButton",
    "esri/dijit/HomeButton",
    "esri/geometry/Point",
    "esri/graphic"
],
function(
    ready, 
    on,
    declare,  
    lang,
    array,
    arcgisUtils,
    LocateButton,
    HomeButton,
    Point,
    Graphic
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;
            ready(lang.hitch(this, function() {
                this._createWebMap();
            }));
        },
        _mapLoaded: function() {
            // Map is ready
            console.log('map loaded');
        },
        //create a map based on the input web map id
        _createWebMap: function() {
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
                    //Optionally define additional map config here for example you can 
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                },
                bingMapsKey: this.config.bingmapskey,
                ignorePopups: true
            }).then(lang.hitch(this, function(response) {
                //Once the map is created we get access to the response which provides important info 
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.  
                this.map = response.map;
                function makeDarker(color, delta, alpha){
                    function add(channel){
                        var newChannel = channel + delta;
                        if (newChannel > 255) {
                            return 255;
                        } else {
                            return newChannel;
                        }
                    }
                    if (color === null) {
                        return color;
                    } else {
                        var darker =  new dojo.Color([add(color.r), add(color.g), add(color.b), alpha]);
                        return darker;
                    }
                }
                function updateInfo(clickEvent){
                    if (clickEvent.graphic !== undefined && clickEvent.graphic !== null) {
                        var id = clickEvent.graphic._graphicsLayer.id;
                        var layers = response.itemInfo.itemData.operationalLayers;
                        var currentId = 0;
                        array.forEach(layers, function(layer, i){
                            if (layer.id === id){
                                currentId = i;
                            }
                        });
                        var html = layers[currentId].popupInfo.description;
                        var formatted = html.format(clickEvent.graphic.attributes)

                        var box = document.getElementById("infobox");
                        var text = document.getElementById("infotext");
                        if (clickEvent.graphic.infoTemplate === undefined){
                            text.innerHTML = formatted;
                        } else {
                            text.innerHTML = clickEvent.graphic.infoTemplate;
                        }
                        box.style.visibility = 'visible';
                        highlight(clickEvent);
                    }
                   
                }
                function highlight(event) {
                    response.map.graphics.clear();
                    if (event.graphic !== undefined) {
                        var fillColor = event.graphic._shape.fillStyle;
                        var strokeColor = event.graphic._shape.strokeStyle.color;
                        var highlightSymbol = 
                            new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, 
                            new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
                            makeDarker(strokeColor, -40, 0.5), 6), makeDarker(fillColor, -40, 0.5));
                        var highlightGraphic = new esri.Graphic(event.graphic.geometry, highlightSymbol);
                        response.map.graphics.add(highlightGraphic);
                    }
                }
                function info(layer) {
                    return 'id=' + layer.id + ' graphicsLayerIds=' + response.map.graphicsLayerIds + ' layerIds=' + response.map.layerIds;
                }
                if (this.map.loaded) {
                    var home = new HomeButton({
                        map: this.map
                    }, "homebutton");
                    home.startup();


                    geoLocate = new LocateButton({
                        map: this.map,
                        scale: 50000
                    }, "locatebutton");
                    geoLocate.startup();

                    on(this.map, 'click', updateInfo);
                    var closebutton = document.getElementById("closebutton");
                    on(closebutton, 'click', function(){
                        this.parentElement.style.visibility = 'hidden';
                    });
                    //console.log(this.map);
                    //on(this.map, 'mouse-over', highlight);
                    //on(this.map, 'mouse-out', function(event){
                        //response.map.graphics.clear();
                    //});
                    this._mapLoaded();
                } else {
                    on(this.map, "load", lang.hitch(this, function() {
                        // do something with the map
                        this._mapLoaded();
                    }));
                }
            }), lang.hitch(this, function(error) {
                //an error occurred - notify the user. In this example we pull the string from the 
                //resource.js file located in the nls folder because we've set the application up 
                //for localization. If you don't need to support mulitple languages you can hardcode the 
                //strings here and comment out the call in index.html to get the localization strings. 
                if (this.config && this.config.i18n) {
                    alert(this.config.i18n.map.error + ": " + error.message);
                } else {
                    alert("Unable to create map: " + error.message);
                }
            }));
        }
    });
});
