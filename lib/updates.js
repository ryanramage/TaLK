
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
        var item = findAgendaItem(req.query.id, doc.items);
        if (!item) return [null, "Invalid item id"];
        if (req.query.text) item.text = req.query.text;
        if (req.query.color) item.colour = req.query.colour;
        return [doc, 'update complete'];
    }

    if (req.query.action == 'delete') {
        var id = req.query.id;
        doc.items = _.reject(doc.items, function(item) { return item.id === id;  })
        return [doc, 'update complete'];
    }

}