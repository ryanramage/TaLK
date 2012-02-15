
var jsonp = require('jsonp');
var couchaudiorecorder = require('lib/couchaudiorecorder_shows');



exports.configInfo = function(doc, req) {
    if (!doc) return;

    return jsonp.response(req.query.callback, doc.kanso);
}

exports['recorder.jnlp'] = function(doc, req) {
    return couchaudiorecorder.recorder_jnlp(doc, req);
}
