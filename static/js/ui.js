var _ = require('underscore')._;
var handlebars = require('handlebars');
var couch = require('db');
var current_db = couch.current();
var session = require('session');
var users = require("users");
var async = require('async');


// unfortunate mix

$.couch.urlPrefix = '_db';
var jquery_db = $.couch.db('');



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
    current_db.getView('geo-stories', 'by_event', function(err, resp) {
        if (err) return alert('Cant get all');
        $('.main').html(handlebars.templates['events-all.html'](resp, {}));
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


        current_db.saveDoc(event, function(err, response) {
            if (err) return alert('Could not create event');

            router.setRoute('/events/' + response.id);

        });



        return false;
    });
    $('.cancel').click(function() {
       history.back();
       return false;
    });
}

function load_event_sessions(eventId, callback) {
    current_db.getView('geo-stories', 'event_sessions', {
        start_key : [eventId],
        end_key : [eventId, {}]
    },function(err, resp) {
        callback(err, resp.rows);
    })
}

function events_show(eventId) {
    activeNav('events-all');
    current_db.getDoc(eventId, function(err, resp) {

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


    })
}


function session_new(eventId) {
    current_db.getDoc(eventId, function(err, resp) {
        if (err) return alert('Cant load the event');

        $('.main').html(handlebars.templates['session-new.html'](resp, {}));

        $('.primary').click(function() {
            var event_session = {};
            event_session.type = 'session';
            event_session.event = eventId;
            event_session.created = new Date().getTime();
            // should validate

            current_db.saveDoc(event_session, function(err, response) {
                if (err) return alert('Could not create event');

                router.setRoute('/events/' + eventId + '/session/' + response.id);
            });

            return false;
        });
        $('.cancel').click(function() {
           history.back();
           return false;
        });

        
    });

}

function session_show(eventId, sessionId) {
    async.parallel({
        assets : function(callback) {
            // get all the session assets
            current_db.getView('geo-stories', 'session_assets', { include_docs: true, start_key:[sessionId], end_key:[sessionId, {}] }, function(err, resp) {
               callback(err, resp.rows);
            });
        },
        event : function(callback) {
            current_db.getDoc(eventId, function(err, resp) {
                callback(err, resp)
            });           
        }     
    },
    function(err, result) {
        if (err) return alert('error: ' + err);
        result.session = _.find(result.assets, function(asset){  if(asset.doc.type === 'session') return true;  } )
        result.recording = _.find(result.assets, function(asset){  if(asset.doc.type !== 'session') return true;  } )

       

        $('.main').html(handlebars.templates['session-show.html'](result, {}));



        var recorder = $('.recorder').couchaudiorecorder({
                  db : jquery_db,
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
            current_db.getView('geo-stories', 'session_assets', { stale : 'update_after', start_key:[sessionId], end_key:[sessionId, {}] }, function(err, resp) {
               
            });

        }).bind("startComplete", function(event, doc) {
            $('.topics')
                .removeClass('disabled')
                .addClass('enabled');
          
        }).bind("recordingComplete", function(event, doc) {

        });

        $('.topic').click(function(){
           $(this).toggleClass('highlight');
        });

        $('.help').twipsy({placement: 'bottom'});

    });
}

function people_all() {
    activeNav('people-all');
    current_db.getView('geo-stories', 'all_people', {include_docs : true}, function(err, resp) {
        if (err) return alert('Cant get all');
        console.log(resp);
        $('.main').html(handlebars.templates['people-all.html'](resp, {}));
        $("table").tablesorter();
    })
}

function people_new(name) {
    activeNav('people-all');
    console.log('people', name)
    $('.main').html(handlebars.templates['people-new.html']({}, {}));

    $('.primary').click(function() {
        var person  = $('form').formParams();
        person.type = 'person';
        current_db.saveDoc(person, function(err, resp) {
            if (err) return alert(err);
        });
        return false;
    })
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
  '/legal/:legalId' : legal_show
};


var router = Router(routes);
router.param('personName', /([^//]+)/);
router.init('/events');




$(function() {
    $('.help').twipsy({placement: 'bottom'});
    $('.modal .cancel').live('click', function() {
        $(this).parent().parent().modal('hide');
    });

});



