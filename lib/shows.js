
var couchaudiorecorder = require('lib/couchaudiorecorder_shows');



exports['recorder.jnlp'] = function(doc, req) {
    return couchaudiorecorder.recorder_jnlp(doc, req);
}
