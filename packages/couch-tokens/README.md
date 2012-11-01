couch-tokens
============

A tokenizer and stemmer for a low cost text search. To be used in a couchdb view.




    map : function(doc) {

        var Tokenizer = require('views/lib/tokenizer');
        var tokenizer = new Tokenizer();
        var id_tokens = tokenizer.tokenize(doc.text);
        for (var i=0; i < tokens.length; i++) {
            emit(token, null);
        }

    }

