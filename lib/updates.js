
var _ = require('underscore')._;

exports.updateAttendees  = function(doc, req) {
    if (!doc) {
      return [null, "Need an existing doc"];
    }
    if (!doc.type === "event") {
        return [null, "The doc must be an event"];
    }
    if (!req.query.personHash) {
        return [null, "Please provide a person"];
    }
    if (!req.query.action) {
            return [null, "Please provide an action"];
    }

    if (!doc.attendees) doc.attendees = [];
    if (req.query.action === 'remove') {
        doc.attendees = _.without(doc.attendees, req.query.personHash);
    } else {
        doc.attendees = _.union(doc.attendees, [req.query.personHash]);
    }
    return [doc, 'update complete'];
  }


exports.endSessionSpeaker = function(doc, req) {
    if (!doc) return [null, "Need an existing doc"];
    if (!doc.type == 'sessionEvent') return [null, "Need a session Event"];
    if (!doc.sessionType == 'speaker') return [null, "Need a speaker doc"];
    doc.endTime = new Date().getTime();
    return [doc, 'update complete'];
}


exports.endSession = function(doc, req) {
    if (!doc) return [null, "Need an existing doc"];
    if (!doc.type == 'session') return [null, "Need a session"];
    if (doc.endTime) return [null, "Session already ended"];
    doc.endTime = new Date().getTime();
    return [doc, 'update complete'];
}

function findAgendaItemById(id, items) {
    return _.find(items, function(item) {  return item.id === id; })
}



exports.updateAgenda = function(doc, req) {
    if (!doc)  {
      return [null, "Need an existing doc"];
    }
    if (!doc.type === "sessionAgenda") {
        return [null, "The doc must be an sessionAgenda"];
    }
    if (!req.query.id) {
        return [null, "Please provide an id"];
    }
    if (!req.query.action) {
            return [null, "Please provide an action"];
    }
    if (!doc.items) doc.items = [];

    if (req.query.action === 'add') {
        var item = {
            id :req.query.id,
            type : req.query.type,
            text : req.query.text,
            colour : req.query.colour
        }
        doc.items.push(item);
        return [doc, 'update complete'];
    }

    if (req.query.action == 'update') {
        var update_id;
        for (var i = 0; i < doc.items.length; i++) {

            if (doc.items[i].id === req.query.id) {
                update_id = doc.items[i].id;
                if (req.query.text) doc.items[i].text = req.query.text;
                if (req.query.colour) doc.items[i].colour = req.query.colour;
            }

        }
        return [doc, 'update complete = ' + update_id];
    }

    if (req.query.action == 'delete') {
        var id = req.query.id;
        doc.items = _.reject(doc.items, function(item) { return item.id === id;  })
        return [doc, 'update complete'];
    }

    return [null, "Nothing Changed"];

}

exports.updateSessionEvent = function(doc, req) {
    if (!doc) {
      return [null, "Need an existing doc"];
    }
    if (doc.type !== 'sessionEvent') {
      return [null, "Can only update a session event"];
    }
    var updated = '';
    if (req.query.start_time && req.query.start_time != doc.startTime) {
        doc.startTime = parseInt(req.query.start_time);
        updated += ' start';
    }
    if (req.query.end_time && req.query.end_time != doc.endTime) {
        doc.endTime = parseInt(req.query.end_time);
        updated += ' end';
    }
    return [doc, 'update complete - ' + updated];
}