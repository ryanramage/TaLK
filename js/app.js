define('js/app',[
    'jquery',
    'underscore',
    'couchr',
    'director',
    'events',
    'js/events'
],
function($, _,  couchr, director, events, events_module){
    var exports = {};
    var emitter = new events.EventEmitter();
    var routes = _.extend({}, events_module.routes());
    var router = director.Router(routes);
    /**
     * This is where you will put things you can do before the dom is loaded.
     */
    exports.init = function() {
        _.invoke([events_module], 'init', {
            selector : '.main',
            emitter : emitter,
            router : router
        });
    }


    emitter.on("section", function(name){
        $('.sidebar-nav li').removeClass('active');
        $('.sidebar-nav').find('.' + name).addClass('active');
    });

    /**
     * This that occur after the dom has loaded.
     */
    exports.on_dom_ready = function(){

        router.init('/events');
    }


    return exports;
});