

exports.by_event = {
    map : function(doc) {
        if (doc.type && doc.type === 'event' ) {
            emit([doc.date, doc.name], null);
        }
    }
}