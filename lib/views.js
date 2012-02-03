
var couchaudiorecorder = require('lib/couchaudiorecorder_views');


exports.by_event = {
    map : function(doc) {
        if (doc.type && doc.type === 'event' ) {
            emit([doc.date, doc.name], null);
        }
    }
}

exports.session_assets = {
    map: function(doc) {
        if (doc.type && doc.type === 'session') {
            return emit([doc._id, doc.type], null);
        }
        if (doc.sessionId) {
            var type = doc.type;
            if (!type) type = 'recording';

            return emit([doc.sessionId, type], null);
        }
    }
}

exports.recordings = couchaudiorecorder.recordings;