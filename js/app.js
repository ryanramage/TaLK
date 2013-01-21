define('js/app',[
    'jquery',
    'underscore',
    'couchr',
    'director',
    'events',
    'js/events',
    'js/people',
    'js/topics'
],
function($, _,  couchr, director, events, events_module, people_module, topics_module){
    var exports = {};
    var emitter = new events.EventEmitter();
    var routes = _.extend({}, events_module.routes(), people_module.routes(), topics_module.routes());
    var router = director.Router(routes);


    /**
     * This is where you will put things you can do before the dom is loaded.
     */
    exports.init = function() {
        var opts = {
            selector : '.main',
            emitter : emitter,
            router : router
        };
        opts.showNav = function (active) {
            emitter.emit('section', active);
        }
        _.invoke([events_module,people_module, topics_module], 'init', opts);
    }


    emitter.on("section", function(name){
        $('.main-menu li').removeClass('active');
        $('.main-menu').find('.' + name).addClass('active');
    });

    /**
     * This that occur after the dom has loaded.
     */
    exports.on_dom_ready = function(){

        router.init('/events');
    }


    return exports;
});