if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments[0];
        if ('DrivingDistance_Kilometers' in args) {
        	return '<b>' + args['To_Navn'] + '</b><div>' + args['To_Adresse'] + '</div><div>'+args['DrivingDistance_Kilometers']+' km</div>'
        }
        return this.replace(/{(\w+)}/g, function(match, key) {
            return (
                (typeof args[key] !== undefined) && (args[key] !== null) && (args[key] !== undefined)
            ) ? convert(args[key]) : '&nbsp;';
        });
    };
}

function convert(value) {
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
        "esri/graphic",
        "esri/tasks/FeatureSet",
        "esri/tasks/Geoprocessor",
        "esri/dijit/analysis/AnalysisBase",
        "esri/dijit/analysis/FindNearest",
        "esri/IdentityManagerBase",
        "dijit/_WidgetBase",
        "esri/layers/FeatureLayer"
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
        Graphic,
        FeatureSet,
        Geoprocessor,
        AnalysisBase,
        FindNearest,
        IdentityManagerBase,
        _WidgetBase,
        FeatureLayer

    ) {
        return declare("", null, {
            config: {},
            constructor: function(config) {
                //config will contain application and user defined info for the template such as i18n strings, 
                // the web map id and application id
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
                        //turn the slider off, display info windows, disable wraparound 180, 
                        //slider position and more. 
                    },
                    bingMapsKey: this.config.bingmapskey,
                    ignorePopups: true
                }).then(lang.hitch(this, function(response) {
                    //Once the map is created we get access to the response which provides important info 
                    //such as the map, operational layers, popup info and more. This object will also contain
                    //any custom options you defined for the template. In this example that is the 'theme' property.
                    //Here' we'll use it to update the application to match the specified color theme.  
                    this.map = response.map;

                    function makeDarker(color, delta, alpha) {
                        function add(channel) {
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
                            var darker = new dojo.Color([add(color.r), add(color.g), add(color.b), alpha]);
                            return darker;
                        }
                    }

                    function updateInfo(clickEvent) {
                        if (clickEvent.graphic !== undefined && clickEvent.graphic !== null) {
                            var id = clickEvent.graphic._graphicsLayer.id;
                            var layers = response.itemInfo.itemData.operationalLayers;
                            var currentId = 0;
                            array.forEach(layers, function(layer, i) {
                                if (layer.id === id) {
                                    currentId = i;
                                }
                            });
                            var html = layers[currentId].popupInfo.description;
                            var formatted = html.format(clickEvent.graphic.attributes)

                            var box = document.getElementById("infobox");
                            var text = document.getElementById("infotext");
                            if (clickEvent.graphic.infoTemplate === undefined) {
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

                    function zoomToPoint() {
                        var comwell = new Point(9.48536876013242, 55.4978890464691);
                        var marker = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 24,
                        	new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("black"), 1), 
                        	new dojo.Color("red"));
                        var picMarker = getPicMarker("arrow.png");
                        var graphic = new esri.Graphic(comwell, picMarker);
                        response.map.graphics.add(graphic);
                        response.map.centerAndZoom(comwell, 15);
                        
                        var set = new FeatureSet();
                        var features = [];
                        var feature = graphic;
                        feature.attributes = {
                            OBJECTID: 1
                        };
                        features.push(graphic);
                        set.features = features;
                        var findNearest = on(response.map, "extent-change", function(){
                        	nearest(set); 
                        	findNearest.remove();
                        });

                    }

                    function locationFound(event) {
                        var graphic = event.graphic;
                        //var graphic = zoomToPoint();
                        var set = new FeatureSet();
                        var features = [];
                        var feature = graphic;
                        feature.attributes = {
                            OBJECTID: 1
                        };
                        features.push(graphic);
                        set.features = features;

                        nearest(set); // use FindNearest analysis task 
                    }

                    function nearest(featureSet) {
                        var customAnalysisWidget = declare([_WidgetBase, AnalysisBase], {});
                        var near = new customAnalysisWidget({
                            toolName: "FindNearest",
                            portalUrl: "http://www.arcgis.com",
                            resultParameter: "connectingLinesLayer" //"nearestLayer" 
                        });

                        var barLayer = response.itemInfo.itemData.operationalLayers[0];
                        var analysisUrl = JSON.stringify({
                            url: barLayer.url
                        });
                        var field = {
                            name: "OBJECTID",
                            type: "esriFieldTypeOID",
                            alias: "OBJECTID"

                        };
                        var fields = [field];
                        var spatial = barLayer.layerObject.spatialReference;
                        var definition = {
                            geometryType: "esriGeometryPoint",
                            fields: fields,
                            spatialReference: spatial
                        };
                        console.log(definition);
                        var params = {
                            jobParams: {
                                nearLayer: analysisUrl,
                                analysisLayer: JSON.stringify({
                                    featureSet: featureSet.toJson(),
                                    layerDefinition: definition
                                }),
                                context: JSON.stringify({
                                    extent: response.map.extent.toJson()
                                }),
                                measurementType: "DrivingDistance",
                                maxCount: 3,
                                searchCutoff: 3,
                                searchCutoffUnits: "Kilometers",
                                returnFeatureCollection: true
                            }
                        };
                        near.execute(params);
                        near.on("job-fail", gpError);
                        near.on("job-result", gpCallback);
                        //on(near, ("job-status", gpCallback));

                    }
                    function getPicMarker(name){
                    		return new esri.symbol.PictureMarkerSymbol('/nearestbar/img/' + name, 48, 48)
                    }

                    function gpCallback(params) {
                        //response.map.graphics.clear();
                        var symbol = new esri.symbol.SimpleLineSymbol(
                            esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                            new dojo.Color("purple"), 8);
                        /* array.forEach(params.value.featureSet.features, function(feature, i) {
									 var nearest = new esri.Graphic(feature.geometry, symbol);
									 console.log(nearest);
									 response.map.graphics.add(nearest);
								}); */
                        var layer = new FeatureLayer(params.value);
                        response.map.addLayer(layer);
                        console.log("callback");
                        console.log(params);
                    }

                    function gpError(error) {
                        console.log("gpError");
                        console.log(error);
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
                            scale: 30000
                        }, "locatebutton");
                        geoLocate.startup();

                        on(geoLocate, 'locate', locationFound);

                        on(this.map, 'click', updateInfo);
                        var closebutton = document.getElementById("closebutton");
                        on(closebutton, 'click', function() {
                            this.parentElement.style.visibility = 'hidden';
                        });
                        
                        zoomToPoint();

                        this._mapLoaded();
                    } else {
                        on(this.map, "load", lang.hitch(this, function() {
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