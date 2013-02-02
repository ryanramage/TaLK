/**
 * User: ryan
 * Date: 12-10-22
 * Time: 10:53 AM
 */
define('js/events', [
    'jquery',
    'underscore',
    'couchr',
    'moment',
    'garden-app-support',
    'jam/jquerypp/form_params',
    'js/queries',
    'js/time',
    'hbt!templates/events-all',
    'hbt!templates/events-new',
    'hbt!templates/events-show',
    'hbt!templates/events-session-list',
    'hbt!templates/people-table',
    'hbt!templates/events-agenda',
    'hbt!templates/session-new',
    'hbt!templates/session-show',
    'hbt!templates/session-show-recordingComplete',
    'hbt!templates/session-play',
    'select2'
], function ($,_, couchr, moment, garden, form_params, queries, time, all_t,
            new_t, show_t, session_list_t, people_table_t, events_agenda_t, session_new_t,
            session_show_t, recording_complete_t, session_play_t) {
    var exports = {},
        selector = '.main',
        options,
        current_tab;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    };

    exports.events_all = function () {
        options.showNav('events-all');
        couchr.get('_ddoc/_view/by_event', function(err, resp){
            resp.rows = _.map(resp.rows, function(row) {
                 row.date_formated = moment(row.key[0]).format('MMMM D, YYYY');
                 row.name = row.key[1];
                return row;
            });
            garden.get_garden_ctx(function(err, garden_ctx) {
                resp.userCtx = garden_ctx.userCtx;
                $(selector).html(all_t(resp, garden_ctx));
            });
        });
    };

    exports.events_new = function() {
        options.showNav('events-all');
        $(selector).html(new_t({}));
        require(['static/js/lib/jquery-ui-1.8.16.custom.min.js'], function(){
            $('.date').datepicker();
        });



        $('form').on('submit', function() {
            var event = $('form').formParams();
            event.type = 'event';
            event.date = new Date(event.date).getTime();
            // should validate

            couchr.post('_db', event, function(err, response){
                options.router.setRoute('/event/' + response.id);
            });
            return false;
        });
        $('.cancel').click(function() {
           history.back();
           return false;
        });
    };

    exports.event_show = function(eventId) {
        // just redirect to the attendees
        options.router.setRoute('/event/' + eventId + '/attendees');
    };

    exports.event_attendees = function(eventId) {
        var current_attendees = { rows : [] };
        events_show_base(eventId, 'attendees_tab', function(resp){
            if (!resp.attendees) {
                resp.attendees = [];
            } else {
                queries.load_event_attendees(resp, function(err, data){
                    current_attendees = data;
                    $('.attendees').html(people_table_t(current_attendees));
                    if (resp.userCtx && resp.userCtx.name) {
                        $('.delete').removeClass('hide').on('click', function(){
                            var personHash = $(this).data('tag');
                            queries.updateEventAttendees(eventId, personHash, 'remove', function(err, result) {
                                if (err) return alert('Could not remove.');
                                $('.' + personHash).remove();
                            });
                        });
                    }
               });
            }
            if (resp.userCtx && resp.userCtx.name) {
                var $input = createPersonAutoComplete($('.personAutoComplete'), function(id, personHash) {
                    if (!id || !personHash) return;
                    if (id === 'new') {
                        // create a new person
                        return options.router.setRoute('/people/new/' + encodeURI(personHash) + '/attendee/' + eventId);
                    } else {
                        queries.updateEventAttendees(eventId, personHash, 'add', function(err, result) {
                            if (err) return alert('Could not add.');
                            couchr.get('_db/' + id, function(err, person){
                                current_attendees.rows.push({doc : person});
                                $('.attendees').html(people_table_t(current_attendees));
                                $input.select2("val","");
                            });
                        });
                    }
                });
            }
        });
    };

    exports.event_agendas = function(eventId) {
        events_show_base(eventId, 'agendas_tab', function(resp){
            queries.load_event_agendas('"' + eventId + '"', function(err, agendas) {

                if (agendas.rows.length > 0) {
                    _.each(agendas.rows, function(agenda_row) {
                        appendAgenda(agenda_row.doc, resp.userCtx, eventId);
                    });
                }


            });
            $('.add-agenda').click(function(){
                var name = $('input[name="agendaName"]').val();
                var agenda = {
                    name : name,
                    event : eventId,
                    type : "sessionAgenda",
                    items : []
                };
                couchr.post('_db/', agenda, function(err, data) {
                        appendAgenda(agenda, resp.userCtx, eventId);
                });
            });
        });
    };

    exports.event_sessions = function(eventId) {
        events_show_base(eventId, 'sessions_tab', function(resp){
            queries.load_event_sessions(eventId, function(err, data) {
                console.log('load event sessions');
                   var d = {};
                   d.sessions = _.map(data.rows, function(row) {
                       return {
                           id : row.id,
                           eventId : eventId,
                           date : row.key[1],
                           endTime : row.key[2],
                           date_formatted : moment(row.key[1]).format('h:mm:ss a')
                       };
                   });
                   $('.sessions').html(session_list_t(d));
            });
        });
    };


    exports.session_new = function(eventId) {
        console.log('new session', eventId);
        couchr.get('_db/' + eventId, function(err, event) {
            event.date_formated = moment(event.date).format('MMMM D, YYYY');
            queries.load_event_attendees(event, function(err, attendees) {
                queries.load_event_agendas('"' + eventId + '"', function(err, agendas) {
                    event.attendees_full = attendees.rows;
                    event.agendas_full = agendas.rows;
                    if (event.agendas_full.length > 0) {
                        event.agendas_full[0].selected = true;
                    }
                    console.log(event);
                    $('.main').html(session_new_t(event));
                    $('table.attendees tr').click(function(event) {
                        if (event.target.type === 'checkbox') return;
                        var $checkbox = $(this).find(':checkbox');
                        $checkbox.prop('checked', !$checkbox[0].checked);

                    });

                    $('.btn-primary').click(function() {
                        var participants = [];
                        $('table.attendees input:checked').each(function() {
                                participants.push($(this).attr('name'));
                        });

                        var agenda_id;
                        $('input[name="agenda"]:checked').each(function() {
                            agenda_id = $(this).val();
                        });

                        var agenda_selected = _.find(event.agendas_full, function(agenda) { return agenda.id === agenda_id;});

                        var event_session = {};
                        event_session.participants = participants;
                        event_session.type = 'session';
                        event_session.event = eventId;
                        event_session.agenda = agenda_selected.doc;
                        event_session.created = new Date().getTime();
                        // should validate
                        console.log(event_session);

                        couchr.post('_db/', event_session, function(err, data) {
                            options.router.setRoute('/event/' + eventId + '/session/' + data.id);
                        });

                        return false;
                    });
                    $('.cancel').click(function() {
                       history.back();
                       return false;
                    });
                });
            });
        });
    };

    exports.session_show = function(eventId, sessionId) {
        options.showNav('events-all');
        queries.load_session_assets(eventId, sessionId, function(err, result) {
            if (err) return alert('error: ' + err);
            $('.main').html(session_show_t(result));


            // FIXME - need to make couchaudio recorder a jam thing.
            $.couch.urlPrefix = '_db';
            var ddocName = 'TaLK';
            var db = $.couch.db('');
            var recorder = $('.recorder').couchaudiorecorder({
                db : db,
                designDoc : ddocName
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
                db.view(ddocName + '/session_assets', {
                    stale : 'update_after',
                    startkey:[sessionId],
                    endkey:[sessionId, {}],
                    success: function() { }
                });

            }).bind("startComplete", function(event, doc) {
                $('.topics, .participants li')
                    .removeClass('disabled')
                    .addClass('enabled');


                $('.topics .topic').click(function() {
                    var me = $(this);
                    var thing_id = me.data('id');
                    var colour   = me.data('colour');
                    var text     = me.find('span').text();
                    startNewMark(sessionId, doc.recordingState.startComplete, thing_id, colour, text);
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
                            me.data('sessionSpeakerId', doc.id);
                        });
                    }
                });
                $('.mark-important').button().click(function() {
                    $(this).button('toggle');
                    setSessionMarkAsImportant();
                });
                $('.save-mark').click(function(){
                    $('.mark-important').button('reset').removeClass('active');
                    saveSessionMark();
                    return false;
                });


                $('.transcript').show();
                sessionListener(sessionId, $('.transcript'), doc.recordingState.startComplete);





            }).bind("recordingComplete", function(event, doc) {
                // add some state to the main doc
                $.post('./_db/_design/'+ddocName+'/_update/endSession/' + sessionId , function(result) {
                    $('.topics, .participants li')
                        .addClass('disabled')
                        .removeClass('enabled');

                    var recordingComplete = {
                        doc_id : doc._id,
                        event_id : eventId,
                        session_id: sessionId,
                        recorded_date_formatted : moment(doc.recordingState.startComplete).format('MMM DD, YYYY, h:mm:ss a'),
                        length : time.convertTime((doc.recordingState.stopComplete - doc.recordingState.startComplete) / 1000)
                    };
                    $('.recordingComplete').html(recording_complete_t(recordingComplete));
                });
            });

        $('.topic').click(function(){
           $(this).toggleClass('highlight');
        });

        $('.help').tooltip({placement: 'bottom'});

        });
    };

    var cached_session_assets;

    exports.session_play = function(eventId, sessionId, startRequest) {
        var start = start || 0;


        // check to see if we are already loaded
        if ($('#' + sessionId).length == 1) {
            var session_startTime = sessionStartTime(cached_session_assets);
            var startTime = calculateStartTimeSeconds(startRequest, cached_session_assets.events, session_startTime);

            $('.player').jPlayer('play', startTime);

        } else {
            queries.load_session_assets(eventId, sessionId, function(err, result) {
                if (err) return alert('error: ' + err);

                $('.main').html(session_play_t(result));
                $('.header-controls').keepInView({
                    zindex: 100
                });
                cached_session_assets = result;
                var session_startTime = sessionStartTime(result);
                var session_endTime = sessionEndTime(result);
                var audio_duration = session_endTime - session_startTime;

                var timeline_width = parseInt( $('.jp-progress-bar').width() );
                var pps = time.calculatePixelsPerSecond(timeline_width, audio_duration / 1000, 1 );

                createTimeBand($('#timebar'), audio_duration/1000, pps);


            });
        }
    };


    function events_show_base(eventId, tab, callback) {
        options.showNav('events-all');
        couchr.get('_db/' + eventId, function(err, resp) {
            resp.date_formated = moment(resp.date).format('MMMM D, YYYY');
            resp[tab] = true;
            $(selector).html(show_t(resp));
            garden.get_garden_ctx(function(err, garden_ctx) {
                resp.userCtx = garden_ctx.userCtx;
                callback(resp);
            });
        });
    }

    function appendAgenda (agenda, userCtx, eventId) {
        $('.agendas').append(events_agenda_t(agenda));


        require(['js/jquery.simple-color.js'], function(){
            $('#' + agenda._id +  ' .simple_color').bind('change', function() {
                var colour = $(this).val();
                if (colour) colour = ''+ colour.substring(1, colour.length); // remove the #
                var id = $(this).data('id');
                updateAgendaItemColour(agenda._id, id, colour, function(err, result) {

                });
            }).simpleColor();
        });



        $('#' + agenda._id +  ' button.delete').bind('click', function() {
            var $me = $(this);
            var id = $me.data('id');
            removeAgendaItem(agenda._id, id,  function(err, result) {
                $me.closest('tr').remove();
            });
        });

        var initalColour = "000000";

        if (userCtx && userCtx.name) {
            var $input = createTopicAutoComplete($('.topicAutoComplete'), function(id, topicHash) {
                if (!id || !topicHash) return;
                if (id === 'new') {
                    // create a new topic
                    return options.router.setRoute('/topics/new/' + encodeURI(topicHash) + '/agendas/' + agenda._id);
                } else {
                    addAgendaItem(agenda._id, id, 'topic', topicHash, initalColour, function(err, result) {
                        //addAgendaItemToUI(agenda, id, 'topic', name, initalColour);
                    });
                }
            });
        }
//        createTagAutoComplete($('#' + agenda._id +  '.agenda-listing .tagAutoComplete'), function(id, tagHash) {
//            addAgendaItem(agenda._id, id, 'tag', tagHash, initalColour, function(err, result) {
//                addAgendaItemToUI(agenda, id, 'tag', tagHash, initalColour);
//            });
//        });
//        createTopicAutoComplete($('#' + agenda._id +  '.agenda-listing .topicAutoComplete'), function(id, name) {
//            addAgendaItem(agenda._id, id, 'topic', name, initalColour, function(err, result) {
//                addAgendaItemToUI(agenda, id, 'topic', name, initalColour);
//            });
//        });
    }

    function createPersonAutoComplete($elem, callback) {
        var $input = $elem.find('input');
        var $btn   = $elem.find('button');
        $input.select2({
            allowClear : true,
            placeholder: 'Add Person',
            query: function (query) {
                queries.queryPeople(query.term, function(data) {
                    var results = _.map(data, function(item){
                        return {
                            text: item.name,
                            value: item.name,
                            id : item.id + ':' + item.name
                        };
                    });
                    query.callback({results:results});

                });
            },
            createSearchChoice:function(term, data) {
                if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
                    return {id:'new' + ':' + term, text:term};
                }
            },
            initSelection : function (element, callback) {
                var data = [];
                $(element.val().split(",")).each(function () {
                    data.push({id: this, text: this});
                });
                callback(data);
            }
        });
        $input.on('change', function(){
            var val = $input.val().split(':');
            callback(val[0], val[1]);
        });
        return $input;
    }
    function createTopicAutoComplete($elem, callback) {
        var $input = $elem.find('input');
        var $btn   = $elem.find('button');
        $input.select2({
            allowClear : true,
            placeholder: 'Add Topic',
            query: function (query) {
                queries.queryTopics(query.term, function(data) {
                    var results = _.map(data, function(item){
                        return {
                            text: item.name,
                            value: item.name,
                            id : item.id + ':' + item.name
                        };
                    });
                    query.callback({results:results});

                });
            },
            createSearchChoice:function(term, data) {
                if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
                    return {id:'new' + ':' + term, text:term};
                }
            },
            initSelection : function (element, callback) {
                var data = [];
                $(element.val().split(",")).each(function () {
                    data.push({id: this, text: this});
                });
                callback(data);
            }
        });
        $input.on('change', function(){
            var val = $input.val().split(':');
            callback(val[0], val[1]);
        });
        return $input;
    }

    function addAgendaItem(agenda_id, id, type, text, colour, callback  ) {
        couchr.post('_ddoc/_update/updateAgenda/' + agenda_id + '?action=add&id=' + id + '&type=' + type +'&text=' + text + '&colour=' + colour, callback);
    }

    function removeAgendaItem(agenda_id, id,  callback  ) {
        couchr.post('_ddoc/_update/updateAgenda/' + agenda_id + '?action=delete&id=' + id , callback);
    }

    function updateAgendaItemColour(agenda_id, id, colour, callback  ) {

        couchr.post('_ddoc/_update/updateAgenda/' + agenda_id + '?action=update&id=' + id + '&colour=' + colour, callback);
    }


    function session_play_leave() {
    }
    function remove_changes_listeners() {
    }

    function sessionStartTime(sessionDetails) {
        if (sessionDetails.recording && sessionDetails.recording.doc.recordingState && sessionDetails.recording.doc.recordingState.startComplete) {
            return sessionDetails.recording.doc.recordingState.startComplete;
        }
        return sessionDetails.session.doc.created;
    }


    function sessionEndTime(sessionDetails) {
        if (sessionDetails.recording && sessionDetails.recording.doc.recordingState && sessionDetails.recording.doc.recordingState.stopComplete) {
            return sessionDetails.recording.doc.recordingState.stopComplete;
        }
        return sessionDetails.session.doc.created;
    }


    function session_show_transcripts(transcript_events, startTime, options) {

        if (!options) options = {};
        _.each(transcript_events, function(sessionEvent) {

            if (sessionEvent.doc.sessionType == 'speaker') {
                if (options.show_timebar) {

                } else {
                    renderSpeaker(sessionEvent.doc, startTime, options);
                }

            }
            if (sessionEvent.doc.sessionType == 'mark') {
                renderMark(sessionEvent.doc, startTime, options);
            }
        } );
    }

    function addTimeFormatting(sessionThing, startTime) {
        sessionThing.startTime_formated = moment(parseInt (sessionThing.startTime)).format('h:mm:ssa');
        sessionThing.offset             = (sessionThing.startTime - startTime) / 1000;
        sessionThing.offset_end         = (sessionThing.endTime - startTime) / 1000;
        sessionThing.offset_formated = convertTime(sessionThing.offset);
    }

    function renderMark(sessionMark, startTime, settings) {
        var defaults = {
            element : '.transcript',
            prepend : true,
            show_timebar : false
        };
        settings = _.defaults(settings, defaults);
        addTimeFormatting(sessionMark, startTime);
        sessionMark.show_timebar = settings.show_timebar;
        if (sessionMark.show_timebar) {
            sessionMark.timebar_left = settings.pps * sessionMark.offset;
            sessionMark.timebar_width = settings.pps * (sessionMark.offset_end - sessionMark.offset);
        }


        var rendered = handlebars.templates['session-show-transcript-mark.html'](sessionMark, {});
        if (settings.prepend) {
            $(settings.element).prepend(rendered);
        } else {
            $(settings.element).append(rendered);
        }

    }

    function sessionListener(sessionId, $trascriptDiv, startTime) {
        // var $changes = db.changes(null, {filter :  ddocName + "/sessionEvents", include_docs: true, sessionId : sessionId});
        // $changes.onChange(function (change) {
        //     _.each(change.results, function(result){
        //         session_show_transcripts([result], startTime);
        //     });
        // });
    }

    var createTimeBand = function(band, seconds, pps) {


        band.addClass('timeband');

        var width = parseInt(band.width());
        var minutes = seconds / 60;
        var pixalsPerMinute =   width / minutes;
        var divsNeeded = Math.floor(minutes);
        var shouldBe = pixalsPerMinute;
        var last = 0;
        for (var i =0; i < divsNeeded; i++) {
            var thisWidth = Math.floor(shouldBe - last) - 1;
            last += (thisWidth + 1);
            var marker = $('<div class="marker" style="width: ' + thisWidth +'px;"></div>');
            band.append(marker);
            shouldBe += pixalsPerMinute;
        }
        band.find('.marker:nth-child(10n)').addClass('markerTenMinute').each(function(i){
            var time = (i+1) * 10;
            var label = $('<div class="timelabel">'+ time + 'm</div>');
            $(this).append(label);


        });
        band.find('.marker:nth-child(60n)').addClass('markerHour');
    };

    exports.routes = function() {
       return  {
           '/events' : exports.events_all,
           '/event/:eventId/session/new' : exports.session_new,
           '/event/:eventId/session/:sessionId/play/:start' : {
              on : exports.session_play,
              after : session_play_leave
           },
           '/event/:eventId/session/:sessionId' : {
              on : exports.session_show,
              after : remove_changes_listeners
           },
           '/event/:eventId/attendees' : exports.event_attendees,
           '/event/:eventId/agendas' : exports.event_agendas,
           '/event/:eventId/sessions' : exports.event_sessions,
           '/event/session/:sessionId' : exports.event_session,
           '/event/:eventId' : exports.event_show,
           '/events/new' : exports.events_new
        };
    };

    return exports;
});