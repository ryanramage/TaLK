var _ = require('underscore')._;
var handlebars = require('handlebars');

var async = require('async');


// unfortunate mix

$.couch.urlPrefix = '_db';
var db = $.couch.db('');

var createHash = function(text) {
    return text.toLowerCase().replace(/ /g, '_');
}

var createPersonHash = function(fistName, lastName) {
    var full = fistName;
    if (lastName) full += '.' + lastName;
    return full.toLowerCase().replace(/\W/g, '.');
}

var queryTags = function(query, callback) {
    var tags = [];
    db.view('geo-stories/all_tags', {
        reduce : false,
        startkey :  query ,
        endkey :  query + '\ufff0' ,
        include_docs : false,
        success : function(resp) {
            tags = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
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

var queryTopics = function(query, callback) {
    var topics = [];
    db.view('geo-stories/all_topics', {
        startkey :  query ,
        endkey :  query + '\ufff0' ,
        success : function(resp) {
            topics = _.map(resp.rows, function(row) {
                return {
                    id: row.id,
                    name: row.value,
                    type: 'topic'
                }
            })
            callback.call(this, topics);
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

function load_event_agendas(eventId, callback) {
    db.view('geo-stories/event_agendas', {
        key : eventId,
        include_docs : true,
        success : function(resp) {
            callback(null, resp.rows);
        }
    })
}

function load_event_attendees(event, callback) {
    db.view('geo-stories/all_people', {
        keys: event.attendees,
        include_docs : true,
        success : function(resp) {
            callback(null, resp);
        }
    });
}

function createTagAutoComplete($elem, callback) {
    var $input = $elem.find('input');
    $input.autocomplete({
        source : function(req, resp) {
            queryTags(req.term, function(data) {
;                resp( _.map( data, function( item ) {
                    return {
                        label: item.name,
                        value: item.name,
                        id : item.id
                    }
                }));
            });
        },
        select: function(event, ui) {
            callback(ui.item.id, ui.item.value);
        }
    });
}

function createTopicAutoComplete($elem, callback) {
    var $input = $elem.find('input');
    $input.autocomplete({
        source : function(req, resp) {
            queryTopics(req.term, function(data) {
;                resp( _.map( data, function( item ) {
                    return {
                        label: item.name,
                        value: item.name,
                        id : item.id
                    }
                }));
            });
        },
        select: function(event, ui) {
            callback(ui.item.id, ui.item.value);
        }
    });
}

function createPersonAutoComplete($elem, callback) {
    var $input = $elem.find('input');
    var $btn   = $elem.find('button');
    $input.autocomplete({
        source : function(req, resp) {
            queryPeople(req.term, function(data) {
                resp( _.map( data, function( item ) {
                    return {
                        label: item.name,
                        value: item.name,
                        id : item.id
                    }
                }));
            });
        },
        select: function(event, ui) {
            callback(ui.item.id, ui.item.value);
        }
    });

}


function updateEventAttendees(eventID, personHash, action, callback) {
    $.post('./_db/_design/geo-stories/_update/updateAttendees/' + eventID + '?personHash=' + personHash + '&action=' + action, function(result) {
        callback(null, result);
    });
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
            if (!resp.attendees) {
                resp.attendees = [];
            } else {
                load_event_attendees(resp, function(err, data){
                   $('.attendees').html(handlebars.templates['people-table.html'](data, {}));
               });
            }
            createPersonAutoComplete($('.personAutoComplete'), function(id, personHash) {
                updateEventAttendees(eventId, personHash, 'add', function(result) {
                    window.location.reload();
                });
            });

            load_event_agendas(eventId, function(err, agendas) {
                _.each(agendas, function(agenda_row) {
                    appendAgenda(agenda_row.doc);
                })
            });
            $('.add-agenda').click(function(){
                var name = $('input[name="agendaName"]').val();
                var agenda = {
                    name : name,
                    event : eventId,
                    type : "sessionAgenda",
                    items : []
                }
                db.saveDoc(agenda, {
                    success : function(data) {
                        console.log(data);
                        appendAgenda(agenda);
                    }
                })
            });
        }
    })
}

function appendAgenda (agenda) {
    console.log(agenda);
    $('.agendas').append(handlebars.templates['events-agenda.html'](agenda, {}));

    createPersonAutoComplete($('#' + agenda._id +  ' .agenda-listing .personAutoComplete'), function(id, personHash) {
        addAgendaItem(agenda._id, id, 'person', personHash, 'blue', function(err, result) {

        });
    });
    createTagAutoComplete($('#' + agenda._id +  '.agenda-listing .tagAutoComplete'), function(id, tagHash) {
        addAgendaItem(agenda._id, id, 'tag', tagHash, 'red', function(err, result) {

        });
    });
    createTopicAutoComplete($('#' + agenda._id +  '.agenda-listing .topicAutoComplete'), function(id, name) {
        addAgendaItem(agenda._id, id, 'topic', name, 'green', function(err, result) {

        });
    });
}


function addAgendaItem(agenda_id, id, type, text, colour, callback  ) {
    $.post('./_db/_design/geo-stories/_update/updateAgenda/' + agenda_id + '?action=add&id=' + id + '&type=' + type +'&text=' + text + '&colour=' + colour, function(result) {
        callback(null, result);
    });
}

function removeAgendaItem(agenda_id, id,  callback  ) {
    $.post('./_db/_design/geo-stories/_update/updateAgenda/' + agenda_id + '?action=remove&id=' + id , function(result) {
        callback(null, result);
    });
}

function updateAgendaItem(agenda_id, id, type, text, colour, callback  ) {
    $.post('./_db/_design/geo-stories/_update/updateAgenda/' + agenda_id + '?action=update&id=' + id + '&type=' + type + '&text=' + text + '&colour=' + colour, function(result) {
        callback(null, result);
    });
}


function session_new(eventId) {
    db.openDoc(eventId, {
        success : function(event) {
            load_event_attendees(event, function(err, attendees_full){

                event.attendees_full = attendees_full.rows;


                load_event_agendas(eventId, function(err, agendas) {
                    console.log(agendas);
                    event.agendas_full = agendas;
                    $('.main').html(handlebars.templates['session-new.html'](event, {}));


                    $('table.attendees tr').click(function() {
                        var $checkbox = $(this).find(':checkbox');
                        $checkbox.prop('checked', !$checkbox[0].checked);
                    })


                    $('.primary').click(function() {

                        var participants = [];
                        $('table.attendees input:checked').each(function() {
                                participants.push($(this).attr('name'));
                        })

                        console.log(participants);

                        var event_session = {};
                        event_session.participants = participants
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
                });
            });
        }
    });

}


function startNewMark(thing_id) {
    $('.tag-text').show();
    var timestamp = new Date().getTime();

}

function endSpeaker(sessionSpeakerId) {
    $.post('./_db/_design/geo-stories/_update/endSessionSpeaker/' + sessionSpeakerId , function(result) {
        //callback(null, result);
    });
}

function startSpeaker(sessionId, personHash, callback){
    var timestamp = new Date().getTime();
    var sessionSpeaker = {
        type : 'sessionEvent',
        sessionId : sessionId,
        sessionType: 'speaker',
        startTime : timestamp,
        person: personHash
    }
    db.saveDoc(sessionSpeaker, {
        success: callback
    });
}


function sessionListener(sessionId, $trascriptDiv) {
    var $changes = db.changes(null, {filter :  "geo-stories/sessionEvents", include_docs: true, sessionId : sessionId});
    $changes.onChange(function (change) {
        console.log(change);
    });
}

function session_show(eventId, sessionId) {
    async.parallel({
        assets : function(callback) {
            // get all the session assets
            db.view('geo-stories/session_assets', {
                include_docs: true,
                startkey:[sessionId],
                endkey:[sessionId, {}, {}] ,
                success : function(resp) {
                    callback(null, resp.rows);
                }
            });
        },
        event : function(callback) {
            db.openDoc(eventId, {
                success : function(event) {
                    load_event_attendees(event, function(err, attendees_full){
                         event.attendees_full = attendees_full.rows;
                         callback(null, event);
                    });
                }
            });
        }     
    },
    function(err, result) {
        if (err) return alert('error: ' + err);
        result.session = _.find(result.assets, function(asset){  if(asset.doc.type === 'session') return true;  } )
        result.recording = _.find(result.assets, function(asset){  if(asset.doc.type !== 'session') return true;  } )
        result.events = _.filter(result.assets, function(asset){ if(asset.doc.type === 'sessionEvent') return true;   });

        result.session.doc.participants_full = _.map(result.session.doc.participants, function(participant){
            return _.find(result.event.attendees_full, function(attendee){return attendee.key === participant});
        });

        console.log(result);

        $('.main').html(handlebars.templates['session-show.html'](result, {}));

        $('.help').tooltip({placement: 'bottom'});

        var recorder = $('.recorder').couchaudiorecorder({
                  db : db,
                  designDoc : 'geo-stories'
        });



        session_show_transcripts(result.events, sessionStartTime(result));

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
            $('.topics, .participants li')
                .removeClass('disabled')
                .addClass('enabled');


            $('.topics').click(function() {
                var me = $(this);
                var thing_id = me.data('topicid');
                startNewMark(thing_id);
            });
            $('.participants li').click(function() {
                var me = $(this);
                var personHash = me.data('topicid');
                var currentlyTalking = me.hasClass('talking');
                me.toggleClass('talking');
                if (currentlyTalking) {
                    var sessionSpeakerId = me.data('sessionSpeakerId');
                    endSpeaker(sessionSpeakerId);
                } else {
                    startSpeaker(sessionId, personHash, function(doc) {
                        console.log(doc);
                        me.data('sessionSpeakerId', doc.id);
                    })
                }
            });
            $('.transcript').show();
            sessionListener(sessionId, $('.transcript'));





        }).bind("recordingComplete", function(event, doc) {
                $('.topics, .participants li')
                    .addClass('disabled')
                    .removeClass('enabled');
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

        $('.help').tooltip({placement: 'bottom'});

    });
}

function sessionStartTime(sessionDetails) {
    if (sessionDetails.recording && sessionDetails.recording.doc.recordingState && sessionDetails.recording.doc.recordingState.startComplete) {
        return sessionDetails.recording.doc.recordingState.startComplete;
    }
    return sessionDetails.session.doc.created;
}


function session_show_transcripts(transcript_events, startTime) {
    console.log('show trans', transcript_events);
    _.each(transcript_events, function(sessionEvent) {
        if (sessionEvent.doc.sessionType == 'speaker') {
            renderSpeaker(sessionEvent.doc, startTime);
        }
    } )
}

function renderSpeaker(sessionEvent, startTime) {
    sessionEvent.startTime_formated = moment(sessionEvent.startTime).format('h:mm:ss a');
    var offset = (sessionEvent.startTime - startTime) / 1000;
    sessionEvent.offset_formated = offset;
    console.log(sessionEvent);
    $('.transcript').append(handlebars.templates['session-show-transcript-speaker.html'](sessionEvent, {}));
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
        var hash = createPersonHash(first,last);
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

function topics_all() {
    activeNav('topics-all');
    db.view('geo-stories/all_topics', {
        include_docs : true,
        success : function(resp) {
            $('.main').html(handlebars.templates['topics-all.html'](resp, {}));
            $("table").tablesorter();
        }
    })

}


function topics_new() {
    activeNav('topics-all');
    $('.main').html(handlebars.templates['topics-new.html']({}, {}));



    $('.primary').click(function() {
        var topic  = $('form').formParams();
        topic.type = 'topic';
        topic.slug = createHash(topic.name);
        db.saveDoc(topic, {
            success : function() {
                router.setRoute('/topics');
            }
        });
        return false;
    });

    $('.cancel').click(function() {
        return false;
    })
}

function topics_show(legalId) {

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
  '/tags/show/:tagHash' : tags_show,
   '/topics' : topics_all,
   '/topics/new' : topics_new,
   '/topics/show/:topicId/:topicSlug' : topics_show
};


var router = Router(routes);
router.param('personName', /([^//]+)/);
router.init('/events');




$(function() {
    $('.help').tooltip({placement: 'bottom'});
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



