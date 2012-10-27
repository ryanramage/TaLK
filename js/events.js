/**
 * User: ryan
 * Date: 12-10-22
 * Time: 10:53 AM
 */
define('js/events', [
    'underscore',
    'couchr',
    'moment',
    'jam/jquerypp/form_params',
    'js/queries',
    'hbt!templates/events-all',
    'hbt!templates/events-new',
    'hbt!templates/events-show',
    'hbt!templates/events-session-list',
    'hbt!templates/people-table',
    'hbt!templates/events-agenda',
    'select2'
], function (_, couchr, moment, form_params, queries, all_t, new_t, show_t, session_list_t, people_table_t, events_agenda_t) {
    var exports = {};
    var selector = '.main'
    var options;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    }

    exports.events_all = function () {
        couchr.get('_ddoc/_view/by_event', function(err, resp){
            resp.rows = _.map(resp.rows, function(row) {
                 row.date_formated = moment(row.key[0]).format('MMMM D, YYYY');
                 row.name = row.key[1];
                return row;
            });

            $(selector).html(all_t(resp, {}));
        });
    }

    exports.events_new = function() {
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
                router.setRoute('/events/' + response.id);
            })
            return false;
        });
        $('.cancel').click(function() {
           history.back();
           return false;
        });
    }

    exports.events_show = function (eventId, tab) {
        couchr.get('_db/' + eventId, function(err, resp) {
                resp.date_formated = moment(resp.date).format('MMMM D, YYYY');
                $(selector).html(show_t(resp));

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
                if (!resp.attendees) {
                    resp.attendees = [];
                } else {
                    queries.load_event_attendees(resp, function(err, data){
                       $('.attendees').html(people_table_t(data));
                   });
                }
//                createPersonAutoComplete($('.personAutoComplete'), function(id, personHash) {
//                    updateEventAttendees(eventId, personHash, 'add', function(result) {
//                        window.location.reload();
//                    });
//                });

                queries.load_event_agendas('"' + eventId + '"', function(err, agendas) {
                    _.each(agendas.rows, function(agenda_row) {
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
                    couchr.post('_db/', agenda, function(err, data) {
                            appendAgenda(agenda);
                    })
                });
//                if (!tab) tab = 'attendees';
//                if (tab === 'attendees') $('.nav-tabs a[href="#attendeesTab"]').tab('show');
//                if (tab === 'agenda') $('.nav-tabs a[href="#agendaTab"]').tab('show');
//                if (tab === 'sessions') $('.nav-tabs a[href="#sessionsTab"]').tab('show');

        })
    }

    function appendAgenda (agenda) {
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

        createPersonAutoComplete($('#' + agenda._id +  '.agenda-listing .personAutoComplete'), function(id, personHash) {
            addAgendaItem(agenda._id, id, 'person', personHash, initalColour, function(err, result) {
                addAgendaItemToUI(agenda, id, 'person', personHash, initalColour);
            });
        });
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
            query: function (query) {
                var data = {results: []}, i, j, s;
                for (i = 1; i < 5; i++) {
                    s = "";
                    for (j = 0; j < i; j++) {s = s + query.term;}
                    data.results.push({id: query.term + i, text: s});
                }
                query.callback(data);
            }


        });
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
           '/events/new' : exports.events_new,
           '/events/:eventId' : exports.events_show
        }
    }

    return exports;
});