define('js/queries', [
    'underscore',
    'couchr'
], function (_, couchr) {
    var exports = {};

    exports.queryTags = function(query, callback) {
        couchr.get('_ddoc/_view/all_tags', {
            reduce : false,
            startkey :  query ,
            endkey :  query + '\ufff0',
            include_docs : false
        }, function(err, resp) {
            if (err) return callback(err);
            var tags = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.key,
                    type: 'tag'
                }
            })
            callback.call(this, tags);
        });
    }

    exports.queryPeople = function(query, callback) {
        couchr.get('_ddoc/_view/all_people', {
            reduce: false,
            startkey :  '"' + query + '"' ,
            endkey :  '"' + query + '\ufff0' + '"' ,
            include_docs : false
        }, function(err, resp) {
            if (err) return callback(err);
            var people = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.key,
                    type: 'person'
                }
            })
            callback.call(this, people);
        });
    }

    exports.queryTopics = function(query, callback) {
        couchr.get('_ddoc/_view/all_topics', {
            startkey :  '"' + query + '"' ,
            endkey :  '"' + query + '\ufff0' + '"' ,
        }, function(err, resp) {
            if (err) return callback(err);
            var topics = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.value,
                    type: 'topic'
                }
            })
            callback.call(this, topics);
        })
    }

    exports.load_event_sessions = function (eventId, callback) {
       couchr.get('_ddoc/_view/event_sessions', {
           startkey : [eventId],
           endkey : [eventId, {}]
       }, callback);
   }

   exports.load_event_agendas = function (eventId, callback) {
           couchr.get('_ddoc/_view/event_agendas', {
           key : eventId,
           include_docs : true
       }, callback);
   }

   exports.load_event_attendees = function (event, callback) {

       if (!event.attendees || event.attendees.length === 0) return callback(null, {rows: []});

       couchr.get('_ddoc/_view/all_people', {
           keys: event.attendees,
           include_docs : true
       }, callback);
   }
   exports.updateEventAttendees = function(eventID, personHash, action, callback) {
        couchr.post('_ddoc/_update/updateAttendees/' + eventID + '?personHash=' + personHash + '&action=' + action, function(result) {
            var err = null;
            if (result !== 'update complete') err = 'Not added';
            callback(null, result);
        });
    }

    return exports;
});