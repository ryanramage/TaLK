/**
 * User: ryan
 * Date: 12-10-30
 * Time: 8:05 PM
 */
define('js/people', [
    'couchr',
    'garden-app-support',
    'hbt!templates/people-all',
    'hbt!templates/people-new'
], function (couchr, garden, all_t, new_t) {
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

    var createPersonHash = function(fistName, lastName) {
        var full = fistName;
        if (lastName) full += '.' + lastName;
        return full.toLowerCase().replace(/\W/g, '.');
    }
    exports.people_new = function(name) {
        console.log(name);
        options.showNav('people-all');
        $('.main').html(new_t({}));

        var generateTag = function() {
            var first = $('form input[name="first_name"]').val();
            var last  = $('form input[name="last_name"]').val();
            var hash = createPersonHash(first,last);
            $('form input[name="tag"]').val(hash);
        }


        $('form input[name="first_name"]').change(generateTag);
        $('form input[name="last_name"]').change(generateTag);

        $('.btn-primary').click(function() {
            var person  = $('form').formParams();
            person.type = 'person';
            db.saveDoc(person, {
                success : function() {
                    router.setRoute('/people');
                }
            });
            return false;
        });

        $('.cancel').click(function() {
            return false;
        })
    }

    exports.routes = function() {
       return  {
           '/people' : exports.people_all,
           '/people/new' : exports.people_new,
           '/people/new/*' : exports.people_new
        }
    }
    return exports;
});