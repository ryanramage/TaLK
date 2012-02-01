
var templates = require('duality/templates');
var couchaudiorecorder = require('lib/couchaudiorecorder_shows');


exports.not_found = function (doc, req) {
    return {
        code: 404,
        title: 'Not found',
        content: templates.render('404.html', req, {})
    };
};


exports['recorder.jnlp'] = function(doc, req) {
    return couchaudiorecorder.recorder_jnlp(doc, req);
}
