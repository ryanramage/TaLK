var _ = require('underscore')._;
var handlebars = require('handlebars');

var async = require('async');


// unfortunate mix

$.couch.urlPrefix = '_db';
var db = $.couch.db('');

var createHash = function(text) {
    return text.toLowerCase().replace(/ /g, '_');
}

var queryTags = function(query, callback) {
    var tags = [];
    db.view('geo-stories/all_tags', {
        reduce : true,
        group : true,
        group_level : 1,
        startkey :  query ,
        endkey :  query + '\ufff0' ,
        include_docs : false,
        success : function(resp) {
            tags = _.map(resp.rows, function(row) {
                return {
                    id: row.key,
                    name: row.key,
                    type: 'tag'
                }
            })
            callback.call(this, tags);
        }
    })
    callback.call(this, tags);
}

var queryPeople = function(query, callback) {
    var people = [];
    db.view('geo-stories/all_people', {
        reduce: false,
        startkey :  query ,
        endkey :  query + '\ufff0' ,
        include_docs : false,
        success : function(resp) {
            people = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.key,
                    type: 'person'
                }
            })
            callback.call(this, people);
        }
    })
}


var activeNav = function(what) {
    $('.nav li').removeClass('active');
    $('.nav li.' + what).addClass('active');
}


var show = function(what, context) {
    if (!context) context = {};
    activeNav(what);
    $('.main').html(handlebars.templates[what + '.html'](context, {}));
} 


function dbRoot(location) {
    return location.protocol + '//' + location.host + '/';
}


function events_all () {
    activeNav('events-all');
    db.view('geo-stories/by_event', {
       success : function(resp) {
        $('.main').html(handlebars.templates['events-all.html'](resp, {}));
       }
    })

}

function events_new() {
    activeNav('events-all');
    $('.main').html(handlebars.templates['events-new.html']({}, {}));
    $('.date').datepicker();


    $('.primary').click(function() {
        var event = $('form').formParams();
        event.type = 'event';
        event.date = new Date(event.date).getTime();
        // should validate

        db.saveDoc(event, {
            success: function(response) {
                router.setRoute('/events/' + response.id);
            }
        });



        return false;
    });
    $('.cancel').click(function() {
       history.back();
       return false;
    });
}

function load_event_sessions(eventId, callback) {
    db.view('geo-stories/event_sessions', {
        startkey : [eventId],
        endkey : [eventId, {}],
        success : function(resp) {
            callback(null, resp.rows);
        }
    })
}

function events_show(eventId) {
    activeNav('events-all');
    db.openDoc(eventId, {
        success : function(resp) {

            resp.date_formated = moment(resp.date).format('MMMM D, YYYY');
            $('.main').html(handlebars.templates['events-show.html'](resp, {}));

            load_event_sessions(eventId, function(err, data) {
               var d = {};
               d.sessions = _.map(data, function(row) {
                   return {
                       id : row.id,
                       eventId : eventId,
                       date : row.key[1],
                       date_formatted : moment(row.key[1]).format('h:mm:ss a')
                   }
               });
               $('.sessions').html(handlebars.templates['events-session-list.html'](d, {}));
            });
        }
    })
}


function session_new(eventId) {
    db.openDoc(eventId, {
        success : function(resp) {

            $('.main').html(handlebars.templates['session-new.html'](resp, {}));

            $('.primary').click(function() {
                var event_session = {};
                event_session.type = 'session';
                event_session.event = eventId;
                event_session.created = new Date().getTime();
                // should validate

                db.saveDoc(event_session, {
                    success : function(response) {

                        router.setRoute('/events/' + eventId + '/session/' + response.id);
                    }
                });
                return false;
            });
            $('.cancel').click(function() {
               history.back();
               return false;
            });
        }
    });

}

function session_show(eventId, sessionId) {
    async.parallel({
        assets : function(callback) {
            // get all the session assets
            db.view('geo-stories/session_assets', {
                include_docs: true,
                startkey:[sessionId],
                endkey:[sessionId, {}] ,
                success : function(resp) {
                    callback(null, resp.rows);
                }
            });
        },
        event : function(callback) {
            db.openDoc(eventId, {
                success : function(resp) {
                    callback(null, resp)
                }
            });
        }     
    },
    function(err, result) {
        if (err) return alert('error: ' + err);
        result.session = _.find(result.assets, function(asset){  if(asset.doc.type === 'session') return true;  } )
        result.recording = _.find(result.assets, function(asset){  if(asset.doc.type !== 'session') return true;  } )

       

        $('.main').html(handlebars.templates['session-show.html'](result, {}));



        var recorder = $('.recorder').couchaudiorecorder({
                  db : db,
                  designDoc : 'geo-stories'
        });


        if (result.recording) {
          recorder.couchaudiorecorder("loadRecording", result.recording.doc._id);
        } else {
          recorder.couchaudiorecorder("newRecording", {
              additionalProperties : {
                  sessionId : sessionId
              }
          });
        }
        recorder.bind("recorderAsked", function(event, doc) {
            // update the view
            db.view('geo-stories/session_assets', {
                stale : 'update_after',
                startkey:[sessionId],
                endkey:[sessionId, {}],
                success: function() { }
            });

        }).bind("startComplete", function(event, doc) {
            $('.topics')
                .removeClass('disabled')
                .addClass('enabled');
          
        }).bind("recordingComplete", function(event, doc) {

        });







        $('.tag-text textarea').mentionsInput({
            triggerChar : ['#', '@'],
            onDataRequest : function(mode, query, callback, triggerChar) {
                if (triggerChar === '#') {
                    queryTags.call(this, query, callback);
                }
                if (triggerChar === '@') {
                    queryPeople.call(this, query, callback);
                }
            }
        });




        $('.topic').click(function(){
           $(this).toggleClass('highlight');
        });

        $('.help').twipsy({placement: 'bottom'});

    });
}

function people_all() {
    activeNav('people-all');
    db.view('geo-stories/all_people', {
        include_docs : true,
        success : function(resp) {
            console.log(resp);
            $('.main').html(handlebars.templates['people-all.html'](resp, {}));
            $("table").tablesorter();
        }
    })
}

function people_new(name) {
    activeNav('people-all');
    console.log('people', name)
    $('.main').html(handlebars.templates['people-new.html']({}, {}));

    var generateTag = function() {
        var first = $('form input[name="first_name"]').val();
        var last  = $('form input[name="last_name"]').val();
        var hash = createHash(first + ' ' + last);
        $('form input[name="tag"]').val(hash);
    }


    $('form input[name="first_name"]').change(generateTag);
    $('form input[name="last_name"]').change(generateTag);

    $('.primary').click(function() {
        var person  = $('form').formParams();
        person.type = 'person';
        db.saveDoc(person, {
            success : function() {
                router.setRoute('/people');
            }
        });
        return false;
    });

    $('.cancel').click(function() {
        return false;
    })


    
}

function person_show(personId) {
    
}


function legal_all() {

}


function legal_new() {

}

function legal_show(legalId) {
    
}

function tags_all() {
    activeNav('tags-all');
    db.view('geo-stories/all_tags', {
        reduce : true,
        group : true,
        group_level : 1,
        success : function(resp) {
            console.log(resp);
            $('.main').html(handlebars.templates['tags-all.html'](resp, {}));
            $("table").tablesorter();
        }
    })
}

function tags_new() {
    activeNav('tags-all');
    $('.main').html(handlebars.templates['tags-new.html']({}, {}));


    $('form input[name="name"]').change(function() {
        var hash = createHash($(this).val());
        console.log(hash);
        $('form input[name="hash"]').val(hash);
    })

    $('.primary').click(function() {
        var tag  = $('form').formParams();
        tag.type = 'tag';
        db.saveDoc(tag, {
            success : function() {
                router.setRoute('/tags');
            }
        });
        return false;
    });

    $('.cancel').click(function() {
        return false;
    })
}

function tags_show(tagHash) {

}


var routes = {
  '/events'   : events_all,
  '/events/new' : events_new,
  '/events/:eventId' : events_show,
  '/events/:eventId/session/new' : session_new,
  '/events/:eventId/session/:sessionId' : session_show,
  '/people' : people_all,
  '/people/new' : people_new,
  '/people/new/:personName' : people_new,
  '/people/:personId' : person_show,
  '/legal' : legal_all,
  '/legal/new' : legal_new,
  '/legal/:legalId' : legal_show,
  '/tags' : tags_all,
  '/tags/new' : tags_new,
  '/tags/show/:tagHash' : tags_show
};


var router = Router(routes);
router.param('personName', /([^//]+)/);
router.init('/events');




$(function() {
    $('.help').twipsy({placement: 'bottom'});
    $('.modal .cancel').live('click', function() {
        $(this).parent().parent().modal('hide');
    });
    // version info
    $.getJSON("./_info",  function(data) {
        var git_rev_small = data.git.commit.substring(0,7);
        var modified = "";
        if (data.git.uncommitted && data.git.uncommitted.length > 0) modified = "*";
        $('footer span.version').text(data.config.version + ':' + git_rev_small + modified);

    })
});



