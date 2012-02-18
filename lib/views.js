
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
            if (type == 'sessionEvent') {
                return emit([doc.sessionId, type, doc.startTime], null);
            } else {
                return emit([doc.sessionId, type], null);
            }

        }
    }
}

exports.recordings = couchaudiorecorder.recordings;


exports.event_sessions = {
    map : function(doc) {
        if (doc.type && doc.type === 'session') {
            emit([doc.event, doc.created], null)
        }
    }
}

exports.all_people = {
    map : function(doc) {
        if (doc.type && doc.type === 'person' ) {
            emit(doc.tag, null);
        }
    }
}

exports.all_tags = {
    map : function(doc) {
        if (doc.type && doc.type === 'tag' ) {
            emit(doc.hash, null);
        }
        if (doc.type && doc.type === 'mark') {

        }
    },
    reduce : '_count'
}

exports.all_topics = {
    map : function(doc) {
        if (doc.type && doc.type === 'topic' ) {
            emit(doc.slug, null);
        }
    }
}