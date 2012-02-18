
var couchaudiorecorder = require('lib/couchaudiorecorder_filters');

exports.recordings = function(doc, req) {
    return couchaudiorecorder.recordings(doc, req);
}


exports.sessionEvents = function(doc, req) {
    if (doc.type !== "sessionEvent") return false;
    if (doc.sessionId != req.query.sessionId) return false;
    return true;
}