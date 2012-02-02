
var couchaudiorecorder = require('lib/couchaudiorecorder_filters');

exports.recordings = function(doc, req) {
    return couchaudiorecorder.recordings(doc, req);
}