define([], function(){
    var exports = {};
    exports.calculatePixelsPerSecond = function(divWidth, audioDuration, zoom ) {
        if (!zoom) zoom = 1;
        return divWidth / (audioDuration * zoom);
    };

    exports.calculateSecondsPerPixel = function(divWidth, audioDuration, zoom ) {
        if (!zoom) zoom = 1;
        return (audioDuration * zoom)/divWidth;
    };

    exports.calculateSecondsPixelSize = function(seconds, pps) {
        var result =  Math.round(seconds * pps);
        if (!result) return 1;
        return result;
    };

    exports.calculateSecondsFromPixals = function(pixals, pps) {
        return pixals / pps;
    };


    var timeFormat = {
         showHour: true,
         showMin: true,
         showSec: true,
         padHour: false,
         padMin: true,
         padSec: true,
         sepHour: ":",
         sepMin: ":",
         sepSec: ""
     };

    exports.convertTime = function(s) {
         var myTime = new Date(s * 1000);
         var hour = myTime.getUTCHours();
         var min = myTime.getUTCMinutes();
         var sec = myTime.getUTCSeconds();
         var strHour = (timeFormat.padHour && hour < 10) ? "0" + hour : hour;
         var strMin = (timeFormat.padMin && min < 10) ? "0" + min : min;
         var strSec = (timeFormat.padSec && sec < 10) ? "0" + sec : sec;
         return ( strHour + timeFormat.sepHour ) + ((timeFormat.showMin) ? strMin + timeFormat.sepMin : "") + ((timeFormat.showSec) ? strSec + timeFormat.sepSec : "");
    };
    return exports;
});