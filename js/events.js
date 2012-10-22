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

    exports.routes = function() {
       return  {
           '/events' : exports.events_all,
           '/events/new' : exports.events_new
        }
    }

    return exports;
});