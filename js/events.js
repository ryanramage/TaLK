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
    'hbt!templates/events-all',
    'hbt!templates/events-new',
    'hbt!templates/events-show',
    'hbt!templates/events-session-list',
    'hbt!templates/people-table',
    'hbt!templates/events-agenda',
    'hbt!templates/session-new',
    'select2'
], function ($,_, couchr, moment, garden, form_params, queries, all_t, new_t, show_t, session_list_t, people_table_t, events_agenda_t, session_new_t) {
    var exports = {},
        selector = '.main',
        options,
        current_tab;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    }

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
            })
        });
    }

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
            })
            return false;
        });
        $('.cancel').click(function() {
           history.back();
           return false;
        });
    }

    exports.event_show = function(eventId) {
        // just redirect to the attendees
        options.router.setRoute('/event/' + eventId + '/attendees');
    }

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
    }

    exports.event_agendas = function(eventId) {
        events_show_base(eventId, 'agendas_tab', function(resp){
            queries.load_event_agendas('"' + eventId + '"', function(err, agendas) {

                if (agendas.rows.length > 0) {
                    _.each(agendas.rows, function(agenda_row) {
                        appendAgenda(agenda_row.doc, resp.userCtx, eventId);
                    })
                }


            });
            $('.add-agenda').click(function(){
                var name = $('input[name="agendaName"]').val();
                var agenda = {
                    name : name,
                    event : eventId,
                    type : "sessionAgenda",
                    items : []
                }
                couchr.post('_db/', agenda, function(err, data) {
                        appendAgenda(agenda, resp.userCtx, eventId);
                })
            });
        });
    }

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
                       }
                   });
                   $('.sessions').html(session_list_t(d));
            });
        });
    }


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
    };

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
        })

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
                        }
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
        })
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
                        }
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


    exports.routes = function() {
       return  {
           '/events' : exports.events_all,
           '/event/:eventId/session/new' : exports.session_new,
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