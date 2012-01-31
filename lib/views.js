

exports.by_roles = {
    map : function(doc) {
        if (doc.type && doc.type === 'role' ) {
            emit(doc.name, doc.url);
        }
    }
}