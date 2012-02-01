var _ = require('underscore')._;
var handlebars = require('handlebars');
var couch = require('db');
var current_db = couch.current();
var session = require('session');
var users = require("users");


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
            events_show(response.id);
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
                session_show(eventId, response.id);
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



