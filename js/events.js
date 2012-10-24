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
    'hbt!templates/events-all',
    'hbt!templates/events-new',
], function (_, couchr, moment, form_params, all_t, new_t) {
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
                           endTime : row.key[2],
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

                            appendAgenda(agenda);
                        }
                    })
                });
                if (!tab) tab = 'attendees';
                if (tab === 'attendees') $('.nav-tabs a[href="#attendeesTab"]').tab('show');
                if (tab === 'agenda') $('.nav-tabs a[href="#agendaTab"]').tab('show');
                if (tab === 'sessions') $('.nav-tabs a[href="#sessionsTab"]').tab('show');
            }
        })
    }
    exports.routes = function() {
       return  {
           '/events' : exports.events_all,
           '/events/new' : exports.events_new
           '/events/:eventId' : exports.events_show
        }
    }

    return exports;
});