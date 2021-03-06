define([], function() {
    //Default configuration settings for the applciation. This is where you'll define things like a bing maps key, 
    //default web map, default app color theme and more. These values can be overwritten by template configuration settings
    //and url parameters.
    var defaults = {
        "appid": "", //"f7af18c42f3740d5abfa241e07874563",
        "webmap": "1379c278ea7f4745a129bed636dd4e21", //"4104323340c04b4c8e06c00d05cd775c",
        //"webmap": "a30160193b1f4922be09d62940f65696",//"de5ae0c2040c49d38e9ea0637454ac73", // "0eece0d5de2140e9a44d8050f943fd18", "de5ae0c2040c49d38e9ea0637454ac73"
        "oauthappid": "bAkrQgFPquOr8OXa", //"AFTKRmv16wj14N3z",
        "clearHash": "false",
        "popup": "true",
        //Group templates must support a group url parameter. This will contain the id of the group. 
        //group: "",
        //Enter the url to the proxy if needed by the applcation. See the 'Using the proxy page' help topic for details
        //http://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html
        "proxyurl": "",
        //Example of a template specific property. If your template had several color schemes
        //you could define the default here and setup configuration settings to allow users to choose a different
        //color theme.  
        "theme": "blue",
        "bingmapskey": "", //Enter the url to your organizations bing maps key if you want to use bing basemaps
        "sharinghost": location.protocol + "//" + "www.arcgis.com" //Defaults to arcgis.com. Set this value to your portal or organization host name. 
    };
    return defaults;
});