/**
 * User: ryan
 * Date: 12-11-20
 * Time: 3:38 PM
 */
define([
    'underscore',
    'couchr',
    'slang',
    'garden-app-support',
    'js/queries',
    'hbt!templates/topics-new',
    'hbt!templates/topics-all'
], function (_, couchr, slang, garden, queries, new_t, all_t) {
    var exports = {};
    var selector = '.main';
    var options;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    };

    function topics_all() {
        options.showNav('topics-all');
        couchr.get('_ddoc/_view/all_topics', {include_docs : true}, function(err, resp) {
            garden.get_garden_ctx(function(err, garden_ctx) {
                resp.userCtx = garden_ctx.userCtx;
                $('.main').html(all_t(resp));
            });
        });
    }

    function topic_details(topicId) {

    }

    function topics_new(name, agendaId) {

        var data = {};
        if (name) {
            data.name = decodeURI(name);
            data.slug = exports.createTopicHash(data.name);
        }


        options.showNav('topics-all');
        $('.main').html(new_t(data));


        var generateTag = function() {
            var name = $('form input[name="name"]').val();
            var hash = exports.createTopicHash(name);
            $('form input[name="slug"]').val(hash);
        };
        $('form input[name="name"]').change(generateTag);

        // what to focus on
        if (data.name && data.slug) {
            delayed_focus('input[name="description"]');
        } else if (data.name ) {
            delayed_focus('input[name="slug"]');
        } else {
            delayed_focus('input[name="name"]');
        }


        $('.btn-primary').click(function() {
            var topic  = $('form').formParams();
            topic.type = 'topic';
            couchr.post('_db', topic, function(err, result){
                if (agendaId) {

                    queries.addAgendaTopicItem(agendaId, result.id, topic.slug, function(err, result) {
                        if (err) return alert('Could not add.');
                        couchr.get('_db/' + agendaId, function(err, agenda) {
                            options.router.setRoute('/event/' + agenda.event + '/agendas');
                        });
                    });

                } else return options.router.setRoute('/topics');
            });
            return false;
        });

        $('.cancel').click(function() {
            if (event) {
                options.router.setRoute('/event/' + event + '/attendees');
            } else {
                options.router.setRoute('/people');
            }
            return false;
        });

    }

    function delayed_focus(elem) {

        setTimeout(function(){
            $(elem).focus();
        }, 300);
    }

    exports.createTopicHash = function(name) {
        return slang.dasherize(name);
    };



    exports.routes = function() {

       return  {
           '/topics' : topics_all,
           '/topics/view/:topicId' : topic_details,
           '/topics/new' : topics_new,
           '/topics/new/*' : topics_new,
           '/topics/new/*/agendas/*' : topics_new
        };
    };
    return exports;
});