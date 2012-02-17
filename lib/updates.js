
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



