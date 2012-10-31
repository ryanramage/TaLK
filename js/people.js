/**
 * User: ryan
 * Date: 12-10-30
 * Time: 8:05 PM
 */
define('js/people', [
    'couchr',
    'js/queries',
    'garden-app-support',
    'hbt!templates/people-all',
    'hbt!templates/people-new',
    'select2'
], function (couchr, queries, garden, all_t, new_t) {
    var exports = {};
    var selector = '.main'
    var options;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    }

    exports.people_all = function() {
        options.showNav('people-all');
        couchr.get('_ddoc/_view/all_people', {include_docs : true}, function(err, resp) {
            garden.get_garden_ctx(function(err, garden_ctx) {
                resp.userCtx = garden_ctx.userCtx;
                $('.main').html(all_t(resp));
                //$("table").tablesorter();
            });
        });
    }
    function trim(str) {
        if (!str) return "";
        return str.replace(/^\s+|\s+$/g, "");
    }
    exports.cleanUpFullName = function(fullName) {
        var name = {
            first : null,
            last : null
        }
        // Lastname, firstname
        if (fullName.indexOf(',')) {
            var pieces = fullName.split(",", 2);
            fullName = trim(pieces[1]) + " " + trim(pieces[0]);

        }
        // email addresses
        if (fullName.indexOf('@')) {
            fullName = fullName.split("@", 1)[0];
        }

        // split, capitialize
        var names = fullName.split(/[\W_]/);
        var newNames = [];
        _.each(names, function(name) {
           if (!name || name == '') return;
           name = trim(name);
           var newName = name[0].toUpperCase() + name.substr(1);
           newNames.push(newName);

        });

        name.first = newNames[0];
        name.last = newNames[1];
        return name;
    }


    exports.createPersonHash = function(fistName, lastName) {
        var full = fistName;
        if (lastName) full += '.' + lastName;
        return full.toLowerCase().replace(/\W/g, '.');
    }

    function delayed_focus(elem) {

        setTimeout(function(){
            console.log('delay!!!');
            console.log($(elem));
            $(elem).focus();
        }, 300);
    }

    exports.people_new = function(name, event) {

        var data = {};
        if (name) {
            name = decodeURI(name);
            data = exports.cleanUpFullName(name);
            data.tag = exports.createPersonHash(data.first, data.last);
        }


        options.showNav('people-all');
        $('.main').html(new_t(data));
        // what to focus on
        if (data.first && data.last && data.tag) {
            delayed_focus('input[name="email"]');
        } else if (data.first && data.last) {
            delayed_focus('input[name="tag"]');
        }
        else if (data.first) {
            delayed_focus('input[name="last_name"]');
        } else {
            delayed_focus('input[name="first_name"]');
        }

        var generateTag = function() {
            var first = $('form input[name="first_name"]').val();
            var last  = $('form input[name="last_name"]').val();
            var hash = exports.createPersonHash(first,last);
            $('form input[name="tag"]').val(hash);
        }


        $('form input[name="first_name"]').change(generateTag);
        $('form input[name="last_name"]').change(generateTag);



        $('form input[name="city"]').select2({
            allowClear : true,
            placeholder: 'Enter City',
            query: function (query) {
                couchr.get('_ddoc/_view/people_cities', {
                    group : true,
                    startkey : '"' + query.term + '"',
                    endkey : '"' + query.term + '\ufff0' + '"'
                }, function(err, data) {
                    var results = _.map(data.rows, function(item){
                        return {
                            text: item.key + ' (' + item.value + ')',
                            id : item.key
                        }
                    });
                    query.callback({results:results});
                });
            },
            createSearchChoice:function(term, data) {
                if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
                    return {id: term, text:term};
                }
            }
        });

        $('form input[name="org"]').select2({
            allowClear : true,
            placeholder: 'Enter Org',
            query: function (query) {
                couchr.get('_ddoc/_view/people_orgs', {
                    group : true,
                    startkey : '"' + query.term + '"',
                    endkey : '"' + query.term + '\ufff0' + '"'
                }, function(err, data) {
                    var results = _.map(data.rows, function(item){
                        return {
                            text: item.key + ' (' + item.value + ')',
                            id : item.key
                        }
                    });
                    query.callback({results:results});
                });
            },
            createSearchChoice:function(term, data) {
                if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
                    return {id: term, text:term};
                }
            }
        });


        $('.btn-primary').click(function() {
            var person  = $('form').formParams();
            person.type = 'person';
            couchr.post('_db', person, function(err, result){
                if (event) {
                    queries.updateEventAttendees(event, person.tag, 'add', function(err, result) {
                        if (err) return alert('Could not add.');
                        options.router.setRoute('/event/' + event + '/attendees');
                    });

                } else return options.router.setRoute('/people');
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
        })
    }

    exports.routes = function() {
       return  {
           '/people' : exports.people_all,
           '/people/new' : exports.people_new,
           '/people/new/*' : exports.people_new,
           '/people/new/*/attendee/*' : exports.people_new
        }
    }
    return exports;
});