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
    'jplayer',
    'mousetrap',
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
    'hbt!templates/events-agenda-row',
    'hbt!templates/session-new',
    'hbt!templates/session-show',
    'hbt!templates/session-show-recordingComplete',
    'hbt!templates/session-play',
    'hbt!templates/session-show-transcript-mark',
    'hbt!templates/session-show-transcript-speaker',
    'hbt!templates/session-show-transcript-topic',
    'select2'
], function ($,_, couchr, moment, jplayer, Mousetrap, garden, form_params, queries, time, all_t,
            new_t, show_t, session_list_t, people_table_t, events_agenda_t, events_agenda_row_t,
            session_new_t, session_show_t, recording_complete_t, session_play_t, show_transcript_mark_t,
            show_transcript_speaker_t, show_transcript_topic_t) {
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

        couchr.get('_db/' + eventId, function(err, event) {
            event.date_formated = moment(event.date).format('MMMM D, YYYY');
            queries.load_event_attendees(event, function(err, attendees) {
                queries.load_event_agendas('"' + eventId + '"', function(err, agendas) {
                    event.attendees_full = attendees.rows;
                    event.agendas_full = agendas.rows;
                    if (event.agendas_full.length > 0) {
                        event.agendas_full[0].selected = true;
                    }

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

    var last_topic_selected;
    var quick_start_time;

    function setStartTime() {
        if (quick_start_time) return;
        quick_start_time = new Date().getTime();
        var startTime_formated = moment(quick_start_time).format('h:mm:ss a');
        $('.quick-entry   label.time span.date-formatted').text(startTime_formated);
        $('.mark-save,.mark-cancel').removeClass('disabled').removeAttr('disabled');
    }

    function resetStartTime() {
        quick_start_time = null;
        $('.quick-entry   label.time span.date-formatted').text('');
        $('.mark-save,.mark-cancel').addClass('disabled').attr('disabled', 'disabled');
        $('.toggled .btn').removeClass('active');
        $('.quick-entry .pane').hide();
        $('.quick-entry textarea').mentionsInput('reset');
    }


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


                $('.quick-entry').show();
                $('textarea').focus();
                $('.pane-toggle').on('click', function(){
                    var $me = $(this);
                    var pane_id = $me.data('pane');
                    if (!$me.hasClass('active')) {
                        $('#' + pane_id).show();
                    } else {
                        $('#' + pane_id).hide();
                    }
                });

                createPersonAutoComplete($('.personAutoComplete'), function(err, person){

                });
                // TODO - add a datepicker and a due date


                $('.topics .topic').click(function() {
                    var me = $(this);
                    var thing_id = me.data('id');
                    var colour   = me.data('colour');
                    var text     = me.find('span').text();
                    var currentlyActive = me.hasClass('talking');
                    me.toggleClass('talking');
                    if (currentlyActive) {
                        var sessionTopicId = me.data('sessionTopicId');
                        endTopic(sessionTopicId);
                        if ($('.topics .topic.talking').size() === 0) {
                            $('.topic-only').removeClass('active').hide();
                            $('.quick-entry .pane').hide();

                        }

                    } else {
                        startTopic(sessionId, thing_id, colour, text, function(err, doc) {
                            me.data('sessionTopicId', doc.id);
                            last_topic_selected = thing_id;
                            $('.topic-only').show();
                        });
                    }

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
                        startSpeaker(sessionId, personHash, function(err, doc) {
                            me.data('sessionSpeakerId', doc.id);
                        });
                    }
                });

                $('.transcript').show();
                sessionListener(sessionId, $('.transcript'), doc.recordingState.startComplete);


                $('.quick-entry textarea').on('keydown', setStartTime);
                $('.toggled').on('click', setStartTime);

                $('.mark-cancel').on('click', resetStartTime);
                $('.mark-save').on('click', function() {
                    saveSessionMark(sessionId, function(err){
                        if (err) return alert('Count not save.');
                        resetStartTime();
                        $('textarea').focus();
                    });
                });
            }).bind("stopComplete", function(event, doc){
                $('.topics, .participants li')
                    .addClass('disabled')
                    .removeClass('enabled');

                $('.quick-entry').hide();
            }).bind("recordingComplete", function(event, doc) {
                // add some state to the main doc
                $.post('./_db/_design/'+ddocName+'/_update/endSession/' + sessionId , function(result) {
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
        $('.quick-entry textarea').mentionsInput({
            triggerChar : ['#', '@'],
            onDataRequest : function(mode, query, callback, triggerChar) {
                if (triggerChar === '#') {
                    queries.queryTags.call(this, query, callback);
                }
                if (triggerChar === '@') {
                    queries.queryPeople.call(this, query, callback);
                }
            }
        });

        $('.topic').click(function(){
           $(this).toggleClass('highlight');
        });

        $('.help').tooltip({placement: 'bottom'});

        });
    };

    var cached_session_assets;
    function calculateStartTimeSeconds(startRequest, sessionEvents, event_start) {
        if (startRequest === 'start') return 0;
        if (startRequest.indexOf('.') > 0 ) {
            return time.fromTimeString(startRequest,'.');
        }
        // it is an event id

        var session_event = _.find(sessionEvents, function(event) {
            if (startRequest === event.id)  return true;
        });
        if (session_event) {
            return (session_event.doc.startTime - event_start  ) / 1000;
        }
    }

    function playDoc(player, doc, startTime) {

        var attachment = findMp3AttachmentName(doc);
        var url = 'audio/' + doc._id + '/' + attachment;
        player.jPlayer("setMedia", {
            mp3: url
        }).jPlayer("play", startTime);
        //uiPlaying(doc);
    }

    function findMp3AttachmentName(doc) {
      var attachment;
      for (attachment in doc._attachments) {
          if (attachment.match(/mp3$/)) {
              return attachment;
          }
      }
      return null;
    }

    function endsWith(str, suffix) {
       return (str[str.length - 1] == suffix);
    }



    exports.session_play = function(eventId, sessionId, startRequest) {
        var start = start || 0;
        var currentPlayTime = 0;

        var update_url_hash_instant = function(){
            if (_.isFunction(history.replaceState) && currentPlayTime >= 1) {

                // one other saftey check that we are on the play screen
                if ($('.timeband').length === 0) return;

                var timeString = time.convertTime(currentPlayTime, '.');
                var hash = '#/event/' + eventId +  '/session/'+ sessionId + '/play/' + timeString;
                history.replaceState({}, time, hash);
            }
        };
        var update_url_hash = _.throttle(update_url_hash_instant, 900);


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
                $player = $('.player');
                $player.jPlayer({
                   swfPath: "/couchaudiorecorder/js/jPlayer",
                   cssSelectorAncestor: "#" + result.session.id,
                   ready : function() {
                       var session_startTime = sessionStartTime(cached_session_assets);
                       var startTime = calculateStartTimeSeconds(startRequest, cached_session_assets.events, session_startTime);
                       playDoc($player, result.recording.doc, startTime);
                   }
                }).bind($.jPlayer.event.ended, function(event) {
                        $('.control .btn').removeClass('active');
                        $('.play .timebar .playhead-mini').css('left', '0px');
                }).bind($.jPlayer.event.timeupdate, function(event) {
                    currentPlayTime = parseInt(Math.floor(event.jPlayer.status.currentTime));
                    var left = time.calculateSecondsPixelSize(event.jPlayer.status.currentTime, pps);
                    $('.play .timebar .playhead-mini').css('left', left + 'px');
                    update_url_hash();
                })
                ;
                $('.play .jp-play-bar span').draggable({
                    axis: "x",
                    containment: ".jp-progress-bar",
                    opacity: 0.7,
                    helper: "clone",
                    stop : function(event, ui) {
                        var start = time.calculateSecondsFromPixals(ui.position.left, pps);
                        $player.jPlayer('play', start);
                        $('.control .btn').addClass('active');
                    }
                });
                $('.play .timebar .time').resizable({
                    maxHeight: 4,
                    minHeight: 4,
                    minWidth: 2,
                    containment: "parent",
                    handles: 'e, w',
                    stop: function(event, ui) {
                        var $me = $(this);
                        var id = $me.data('id');
                        var left = $me.css('left').replace('px', '');
                        var width = $me.css('width').replace('px', '');
                        var start = time.calculateSecondsFromPixals(left, pps);
                        var new_start_time = Math.round( (start * 1000)  + session_startTime );
                        var new_end_time = Math.round( (time.calculateSecondsFromPixals(width, pps) * 1000) + new_start_time );
                        updateSessionEvent(id, new_start_time, new_end_time, function(err, updated) {
                            if (err) return alert('could not update: ' + err);
                            // only reset the playhead if the start changed
                            if (updated.indexOf('start') > 0 ) {
                                $player.jPlayer('play', start);
                                $('.control .btn').addClass('active');
                            }
                        });
                    }
                }).tooltip({placement: 'right', delay: { show: 500, hide: 100 } })
                  .on('click', function() {
                        var id = $(this).data('id');
                        var route = 'events/' + eventId + '/session/' + sessionId + '/play/' + id;
                        $('.control .btn').addClass('active');
                        if (window.location.hash == '#/' + route) {
                            // since we are on the url, we have to play direct
                            var left = $(this).css('left').replace('px', '');
                            var start = time.calculateSecondsFromPixals(left, pps);
                            $player.jPlayer('play', start);
                        } else {
                            router.setRoute('events/' + eventId + '/session/' + sessionId + '/play/' + id);
                        }
                  });

                $('.control .btn').button().on('click', function(){
                    if ($(this).hasClass('active')) $player.jPlayer('pause');
                    else $player.jPlayer('play');
                });

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
                        addAgendaItemToUI(agenda, id, 'topic', topicHash, initalColour);
                        $input.select2("val", "");
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

    function addAgendaItemToUI(agenda, id, type, text, colour) {
        var item = {
            id: id,
            type: type,
            colour: colour,
            text: text
        };


        $('#' + agenda._id +  ' table').show();

        $('#' + agenda._id +  ' tbody').append(events_agenda_row_t([item]));
        $('#' + id +  ' .simple_color').bind('change', function(){
            var colour = $(this).val();
            if (colour) colour = '' + colour.substring(1, colour.length); // remove the #
            var id = $(this).data('id');
            updateAgendaItemColour(agenda._id, id, colour, function(err, result) {

            });
        }).simpleColor();
        $('#' + id +  ' button.delete').bind('click', function(){
            var $me = $(this);
            var id = $me.data('id');
            removeAgendaItem(agenda._id, id,  function(err, result) {
                $me.closest('tr').remove();
            });
        });
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

            if (sessionEvent.sessionType == 'speaker') {
                if (!options.show_timebar) {
                    renderSpeaker(sessionEvent, startTime, options);
                }
            }
            if (sessionEvent.sessionType == 'topic') {
                if (!options.show_timebar) {
                    renderTopic(sessionEvent, startTime, options);
                }
            }
            if (sessionEvent.sessionType == 'mark') {
                renderMark(sessionEvent, startTime, options);
            }
        } );
    }
    function renderMark(sessionMark, startTime, settings) {
        // safeguard duble posts
        sessionMark.dom_id = sessionMark._id;
        if ($('#'  + sessionMark.dom_id).size() > 0) return;

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


        var rendered = show_transcript_mark_t(sessionMark);
        if (settings.prepend) {
            $(settings.element).prepend(rendered);
        } else {
            $(settings.element).append(rendered);
        }

    }


    function renderSpeaker(sessionEvent, startTime, settings) {
        // safeguard duble posts
        sessionEvent.dom_id = sessionEvent._id;
        if (sessionEvent.endTime) {
            sessionEvent.dom_id = sessionEvent._id + '_end';
        }

        if ($('#' + sessionEvent.dom_id).size() > 0) return;

        var defaults = {
            element : '.transcript',
            prepend : true,
            show_timebar : false
        };
        settings = _.defaults(settings, defaults);
        addTimeFormatting(sessionEvent, startTime);
        sessionEvent.show_timebar = settings.show_timebar;
        var rendered = show_transcript_speaker_t(sessionEvent);
        if (settings.prepend) {
            $(settings.element).prepend(rendered);
        } else {
            $(settings.element).append(rendered);
        }
    }


    function renderTopic(sessionEvent, startTime, settings) {
        // safeguard duble posts
        sessionEvent.dom_id = sessionEvent._id;
        if (sessionEvent.endTime) {
            sessionEvent.dom_id = sessionEvent._id + '_end';
        }

        if ($('#' + sessionEvent.dom_id).size() > 0) return;

        var defaults = {
            element : '.transcript',
            prepend : true,
            show_timebar : false
        };
        settings = _.defaults(settings, defaults);
        addTimeFormatting(sessionEvent, startTime);
        sessionEvent.show_timebar = settings.show_timebar;
        var rendered = show_transcript_topic_t(sessionEvent);
        if (settings.prepend) {
            $(settings.element).prepend(rendered);
        } else {
            $(settings.element).append(rendered);
        }
    }



    function addTimeFormatting(sessionThing, startTime) {
        sessionThing.startTime_formated = moment(parseInt (sessionThing.startTime)).format('h:mm:ssa');
        sessionThing.offset             = (sessionThing.startTime - startTime) / 1000;
        sessionThing.offset_end         = (sessionThing.endTime - startTime) / 1000;
        sessionThing.offset_formated = time.convertTime(sessionThing.offset);
    }

    function sessionListener(sessionId, $trascriptDiv, startTime) {
        var feed = couchr.changes('_db', {filter :  "TaLK/sessionEvents", include_docs: true, sessionId : sessionId});
        feed.on('change', function(change){
            console.log(change);
            session_show_transcripts([change.doc], startTime);
        });
        feed.resume();
        return feed;
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

    var ugly_current_session_mark;

    function startNewMark(sessionId, startTime, thing_id, colour, text) {
        $('.tag-text').show();
        var timestamp = new Date().getTime();
        var sessionMark = {
            type : 'sessionEvent',
            sessionId : sessionId,
            sessionType: 'mark',
            startTime : timestamp,
            thing_id : thing_id,
            colour : colour,
            text : text,
            sessionEventCount : 1
        };
        var startTime_formated = moment(sessionMark.startTime).format('h:mm:ss a');
        var offset = (sessionMark.startTime - startTime) / 1000;
        var offset_formated = time.convertTime(offset);

        $('form.tag-text  label.time span.date-formatted').text(startTime_formated);
        $('form.tag-text label.time span.time-formatted').text('[' + offset_formated + ']');

        $('form.tag-text i.icon-tag').css('background-color', '#' + colour);

        ugly_current_session_mark = sessionMark;

        $('textarea').focus();

        findHighestSessionEventNumber(sessionId, function(err, highest) {
            highest += 1;

            $('form.tag-text span.sessionEventCount').text(highest + '');
            ugly_current_session_mark.sessionEventCount = highest;
        });
    }

    function setSessionMarkAsImportant () {
        ugly_current_session_mark.important = true;
    }

    function saveSessionMark(sessionId, callback) {

        var timestamp = quick_start_time;
        if (!timestamp) {
            timestamp = new Date().getTime();
        }
        var talking = [];
        $('.participants li.talking').each(function(){
            talking.push($(this).data('topicid'));
        });

        var sessionMark = {
            type : 'sessionEvent',
            sessionId : sessionId,
            sessionType: 'mark',
            startTime : timestamp,
            endTime : new Date().getTime(),
            talking : talking,
            sessionEventCount : 1
        };
        if (last_topic_selected) {
            sessionMark.thing_id = last_topic_selected;
        }



        // add extras.
        $('.toggled .btn.active').each(function(){
            var thing = $(this).data('pane');
            if (thing === 'important-point') sessionMark.importantPoint = true;
            if (thing === 'action-entry') {
                sessionMark.action = true;
                sessionMark.actionAssigned = $('#action-delegate').val().split(':')[1];
            }
            if (thing === 'vote-entry') {
                sessionMark.vote = true;
                sessionMark.voteFor = $('#vote-for').val();
                sessionMark.voteAgainst = $('#vote-against').val();
            }
            if (thing === 'topic-status') {
                sessionMark.topicStatus = true;
                sessionMark.topicStatusValue = $('#topic-status-select').val();
            }
        });

        $('.quick-entry textarea').mentionsInput('val', function(text) {
            $('.quick-entry textarea').mentionsInput('getMentions', function(tags) {
                sessionMark.text = text;
                sessionMark.tags = tags;
                findHighestSessionEventNumber(sessionId, function(err, highest) {
                    if (err) return callback(err);
                    highest += 1;
                    sessionMark.sessionEventCount = highest;

                    couchr.post('_db', sessionMark, callback);
                });

            });
        });
    }


    function startTopic(sessionId, topicId, colour, text, callback) {
        var timestamp = new Date().getTime();
        var sessionMark = {
            type : 'sessionEvent',
            sessionId : sessionId,
            sessionType: 'topic',
            startTime : timestamp,
            thing_id : topicId,
            text: text,
            colour : colour,
            sessionEventCount : 1
        };
        findHighestSessionEventNumber(sessionId, function(err, highest) {
            if (err) return callback(err);
            highest += 1;
            sessionMark.sessionEventCount = highest;
            couchr.post('_db', sessionMark, callback);
        });
    }

    function endTopic(sessionTopicId) {
        couchr.post('_ddoc/_update/endSessionTopic/' + sessionTopicId, function(result){
                //huh?
        });
    }

    function endSpeaker(sessionSpeakerId) {
        couchr.post('_ddoc/_update/endSessionSpeaker/' + sessionSpeakerId, function(result){
                //huh?
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
        };
        couchr.post('_db', sessionSpeaker, callback);
    }

    function findHighestSessionEventNumber(sessionId, callback) {
        var highest = 0;
        couchr.get('_ddoc/_view/session_highest_session_number', {
            key: '"' + sessionId + '"',
            reduce: true
        }, function(err, resp) {
            if (err) return callback(err);
            if (resp.rows && resp.rows.length && resp.rows.length == 1 && resp.rows[0].value) {
                highest = resp.rows[0].value.max;
            }
            callback(null, highest);
        });
    }


    exports.routes = function() {
       return  {
           '/events' : exports.events_all,
           '/event/:eventId/session/new' : exports.session_new,
           '/event/:eventId/session/:sessionId/play/*' : {
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