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
        console.log(resp);
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



function events_show(eventId) {
    activeNav('events-all');
    current_db.getDoc(eventId, function(err, resp) {
             
        $('.main').html(handlebars.templates['events-show.html'](resp, {}));
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

        console.log(result);

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

        }).bind("recordingComplete", function(event, doc) {

        });



    });
}




var routes = {
  '/events'   : events_all,
  '/events/new' : events_new,
  '/events/:eventId' : events_show,
  '/events/:eventId/session/new' : session_new,
  '/events/:eventId/session/:sessionId' : session_show
};


var router = Router(routes);
router.init('/events');




$(function() {

    


    $('.help').twipsy({placement: 'bottom'});
    $('.modal .cancel').live('click', function() {
        $(this).parent().parent().modal('hide');
    });

});



