var _ = require('underscore')._;
var handlebars = require('handlebars');
var garden_urls = require('lib/garden_urls');
var userType = require('lib/userType');
var couch = require('db');
var current_db = couch.current();
var session = require('session');
var users = require("users");


var show = function(what, context) {
    if (!context) context = {};
    $('.nav li').removeClass('active');
    $('.nav li.' + what).addClass('active');
    $('.main').html(handlebars.templates[what + '.html'](context, {}));
} 


function oneUrl(location) {
    return location.protocol + '//' + location.host + location.pathname;
}

function dbRoot(location) {
    return location.protocol + '//' + location.host + '/';
}


function getApps(callback) {
    
    current_db.getView('dashboard', 'by_active_install', {include_docs: true}, function(err, response) {
        if (err) {
            return alert(err);
        }
        var data = {};
        data.apps = _.map(response.rows, function(row) {

            // we should verify these by checking the db and design docs exist.

            var app_data = row.doc;
            return {
                id   : app_data._id,
                img  : garden_urls.bestIcon128(app_data),
                name : app_data.dashboard_title,
                db   : app_data.installed.db,
                start_url : garden_urls.get_launch_url(app_data)
            }
        });
        callback(data);
    });
}


function showApps() {
    show('apps');

    getApps(function(data) {
        if (!data.apps || data.apps.length === 0) {
            $('.message').html(handlebars.templates['no_apps_message.html']({}, {}));
            return;
        }

        // get any stored ordering
        var order = amplify.store('dashboardOrder');

        if (order) {
            var max = 1000;
            var current_past_end = data.apps.length + 1;
            data.apps = _.sortBy(data.apps, function(app) {
                var dash_order = current_past_end++;
                if (order[app.id] && order[app.id] >= 0) dash_order = order[app.id];
                dash_order =  dash_order;

                return dash_order;
            });
        }



        $('.app').html(handlebars.templates['app_list.html'](data, {}));




        //  begin crazy stuff to get a short click (with animation) and a long click to settings
        $('ul.app .thumbnail').click(function(event){

            try {
                var id = $(this).data('id');
                var now = new Date().getTime();
                if (longclickinfo.id === id && (now - longclickinfo.start) > 900 ) return;

                var name = $(this).data('name');
                var link = $(this).parent().attr('href');


                window.location = link;


            } catch (e) {
                console.log(e);
            }
            return false;


        });

        var longclickinfo = {

        }
        function cancelLongClick() {
            longclickinfo.id = null;
            longclickinfo.start = null;
            if (longclickinfo.showMsg)
                clearTimeout(longclickinfo.showMsg);
        }
        
        $('ul.app a').click(function() {
            return false;
        });
        var thumbnail = $('ul.app .thumbnail')
        thumbnail.twipsy({
            trigger: 'manual',
            title: 'Enter Settings...'
        });

        thumbnail.bind('mousedown touchstart', function(event) {
            var me = $(this);
            me.find('img').addClass('thumbnail-mouse-down');
            longclickinfo.id = $(this).data('id');
            longclickinfo.start = new Date().getTime();
            longclickinfo.showMsg = setTimeout(function(){
                me.twipsy('show');
            }, 900)
        });
        thumbnail.bind('mousemove touchmove', function(){
            cancelLongClick();
            $(this).twipsy('hide')
              .find('img').removeClass('thumbnail-mouse-down');
        });
        thumbnail.bind('mouseup touchend', function(event){
            var id = $(this).data('id');
            var now = new Date().getTime();
            if (longclickinfo.id === id && (now - longclickinfo.start) > 900 ) {
                try {
                    event.stopPropagation();
                   $(this).twipsy('hide');
                   router.setRoute('/apps/info/' + id);

                } catch(e) {
                }
            } else {
                $(this).twipsy('hide');
                cancelLongClick();
            }
            $(this).find('img').removeClass('thumbnail-mouse-down');
        });

        // End of crazy 

        $('ul.app').sortable({
            update: function() {
                var order = {};
                var count = 1;
                $('.thumbnail').each(function() {
                    var id = $(this).data('id');
                    order[id] = count++;
                });
                amplify.store('dashboardOrder', order);
            }
        });
        $('ul.app').disableSelection();


    });
}


function getMarkets(callback) {
    current_db.getView('dashboard', 'by_markets', {include_docs: true}, function(err, response) {
        if (err) return alert('cant load markets');
        var data = {};
        data.gardens =  _.map(response.rows, function(row) {
            return {
                name : row.key,
                url : row.value
            }
        });
        data.gardens.push({
            type: 'market',
            name : "Kanso Garden",
            url : "http://garden.iriscouch.com/garden/_design/garden/_rewrite/"
        });

        data = addDashboardUrl(data);
        callback(data);
    });
}


function addDashboardUrl(data) {
    var dashboardUrl = oneUrl(window.location);
    data.gardens = _.map(data.gardens, function(row) {
       row.url = row.url + '?dashboard=' + dashboardUrl;
       return row;
    });
    return data;
}



function showMarkets() {
    show('markets');
    getMarkets(function(data) {
        $('ul.gardens').html(handlebars.templates['garden_details.html'](data, {}));
    })

    $('.add-market').click(function() {
        $('.add-market').hide();
        $('.new-market').show(500);
        return false;
    });

    $('.cancel').click(function() {
        $('.add-market').show();
        $('.new-market').hide(500);
        return false;
    });

    $('#add-market-final').click(function() {

        var market = {
            type : 'market',
            url : $('#market-url').val(),
            name : $('#market-name').val()
        }

        current_db.saveDoc(market, function(err, response) {
            if (err) return alert('could not save');
            var d = {
                gardens : [market]
            }
            d = addDashboardUrl(d);
            $('ul.gardens').append(handlebars.templates['garden_details.html'](d, {}));

            $('.add-market').show();
            $('.new-market').hide(500);
        })

        return false;

    });
}

function viewApp(id) {

    $('.nav li').removeClass('active');
    $('.nav li.apps' ).addClass('active');


    current_db.getDoc(id, function(err, doc) {


         doc.installed_text = moment(new Date(doc.installed.date)).calendar();
         doc.icon_src = garden_urls.bestIcon96(doc);


        $('.main').html(handlebars.templates['app_details.html'](doc, {}));


        $('.form-actions .btn').twipsy({placement: 'bottom'});

        var app_db = couch.use(doc.installed.db);
        app_db.info(function(err, data) {
            var nice_size = garden_urls.formatSize(data.disk_size);
            $('#db-size').text(nice_size);
        })



        $('.edit-title').blur(function() {
            doc.dashboard_title = $(this).text();
            current_db.saveDoc(doc, function(err, response){
               if (err) return alert('could not save');
               doc._rev = response.rev;
            });
        })




        $('#delete-final').click(function() {
            $(this).parent().parent().modal('hide');
            couch.deleteDatabase(doc.installed.db, function(err, response) {
               if (err) {
                   return alert('Could not delete db');
               }
               current_db.removeDoc(doc, function(err, response) {
                    // go to the dashboard.
                    router.setRoute('/settings');
               });
            });
        });


        function updateStatus(msg, percent, complete) {
            $('.activity-info .bar').css('width', percent);
            if (complete) {
                $('.activity-info .progress').removeClass('active');
            }
        }


        $('#compact-final').click(function(){
            $('.activity-info').show();
            updateStatus('Compacting', '50%', true);
            $.couch.db(doc.installed.db).compact({
               success : function(){
                   updateStatus('Done Compact', '100%', true);
                   setTimeout(function() {
                       $('.activity-info').hide();
                       var app_db = couch.use(doc.installed.db);
                       app_db.info(function(err, data) {
                            var nice_size = garden_urls.formatSize(data.disk_size)
                            $('#db-size').text(nice_size);
                       })

                   }, 3000);
                   
               }
            });
        });


        $('#clone-app-start').click(function(){
            $('#newAppName').val(doc.dashboard_title);
        });

        $('#clone-final').click(function() {
            $(this).parent().parent().modal('hide');
            $('.activity-info').show();
            updateStatus('Copying', '20%', true);


            var replicationOptions = {
                create_target:true
            };
            
            if (! $('#copyData').is(':checked') ) {
                replicationOptions.doc_ids = [ '_design/' + doc.doc_id ];
            }

            var app_data = $.extend(true, {}, doc);
            delete app_data._id;
            delete app_data._rev;
            delete app_data.installed_text;


            app_data.dashboard_title = $('#newAppName').val();


            $.couch.allDbs({
                success : function(data) {
                    var db_name = garden_urls.find_next_db_name(doc.installed.db, data);

                    app_data.installed.db = db_name;
                    app_data.installed.date = new Date().getTime();


                    $.couch.replicate(doc.installed.db, db_name, {
                       success : function() {
                            current_db.saveDoc(app_data, function() {
                                setTimeout(function() {
                                   $('.activity-info').hide();

                               }, 3000);
                            });

  


                       }
                    }, replicationOptions);
                }
            });








            
        })



    });



    
}



function showSync() {
    show('sync');




    // we need the following info to figure best option
    //console.log(System.os);
    //console.log(System.check_plugin('java'));

    $('.other').click(function() {
        $('table.platform-installs').show();
        $(this).hide();
        return false;
    });
}



function getAdmins(callback) {
    $.couch.config({
        success : function(data) {
              var keys = [];
              for(var i in data) if (data.hasOwnProperty(i)){
                keys.push(i);
              }

            if (callback) callback(keys);

        },
        error : function() {
            console.log('not an admin');
        }
    }, 'admins')

}



function getRoles(callback) {
    current_db.getView('dashboard', 'by_roles', {include_docs : 'true'}, function(err, response) {
        console.log(response);
        callback(response.rows);
    });
}

function getUsers(callback) {
    users.list(function (err, list) {
        if (err) {
           
        }
        else  callback(list);
    });
}




function showSettings() {

    session.info(function(err, info) {
        isAdmin = userType.isAdmin(info);
        show('settings', {isAdmin : isAdmin});

        if (!isAdmin) return;
        getApps(function(data) {
             $('.app-list-condensed').html(handlebars.templates['settings-apps.html'](data, {}));
        });

        getAdmins(function(admins) {
            var data = {
                admins : admins
            };
            $('.admin-list').html(handlebars.templates['admins.html'](data, {}));
        });

        getRoles(function(roles) {
            var data = {
                roles : roles
            }
            $('.role-list').html(handlebars.templates['roles.html'](data, {}));
        });





        getUsers(function(data) {

        });
    });



}

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}


function installApp() {
    $('.nav li').removeClass('active');
    $('.nav li.apps' ).addClass('active');


    var context = {
        app_url : getParameterByName('app_url'),
        app_name : getParameterByName('app_name'),
        is_auth : true
    };

    console.log(context);

    $('.main').html(handlebars.templates['install.html'](context, {}));
}


function showLogin() {
    show('login');

    $('#login-btn').click(function() {
        var username = $('#username').val();
        var password = $('#password').val();
        console.log('calling login', username, password);
        session.login(username, password, function (err, info) {
            if (err) {
                var warning = $('.warning');
                    warning.show()
                    warning.find('strong').text(err.error);
                    warning.find('span').text(err.reason);
                    $('#password').val('');
            } else {

                //lame but, we can only get admin names for this.
                afterRender(function() {
                    router.setRoute('/apps');
                });
            }
        });
        return false;
    });
    
}




function adjustUIforUser(info, callback) {
        var isAdmin = userType.isAdmin(info);
        if (!isAdmin) {
            $('.admin-only').hide();
        } else {
            $('.admin-only').show();
        }

        var isUser = userType.isUser(info);
        if (isUser) {
            $('.user').show();
            $('.username').text(userType.getUsername(info));
            $('.login').hide();
        } else {
            $('.user').hide();
            $('.login').show();
        }
        if (callback) callback();


}



function afterRender(callback) {

    session.info(function(err, info) {
        adjustUIforUser(info, callback);
    });
}


var routes = {
  '/apps'   : showApps,
  '/apps/info/:db' : viewApp,
  '/apps/install' : installApp,
  '/markets': showMarkets,
  '/sync'   : showSync,
  '/settings'   : showSettings,
  '/login' : showLogin
};


var router = Router(routes);
router.configure({
   on: afterRender
});
router.init('/apps');





$(function() {
    $('#garden-navigation').twipsy({placement: 'right'});
    $('.help').twipsy({placement: 'bottom'});


    $('.modal .cancel').live('click', function() {
        $(this).parent().parent().modal('hide');
    });

    //query feeds
    var data = [];
    data.feeds = [
        {
            app : 'http://placehold.it/20x20',
            message : 'You added Get Milk',
            date: '2012-01-13T09:24:17Z'
        }

    ]
    $('.feed').append(handlebars.templates['feed_details.html'](data, {}));



    $('.admin-delete').live('click', function(){
       var me = $(this);
       var name = $(this).data('name');

       users.delete(name, function(err) {
           if (err) return alert('could not delete.' + err);
           me.closest('tr').remove();
       });

    });

    $('#add-admin-final').live('click', function(){
        var username = $('#admin-name').val();
        var password = $('#admin-password').val();
        $('#add-admin-dialog').modal('hide');
        users.create(username, password,{roles : ['_admin']}, function(err) {
            if(err) return alert('Cant create admin');
            // admin created
            var data = {
                admins : [username]
            };
            $('.admin-list').append(handlebars.templates['admins.html'](data, {}));
            $('#admin-name').val('');
            $('#admin-password').val('');

        })
    });


    $('#add-role-final').live('click', function() {
        var role = {
            type : 'role',
            name : $('#role-name').val()
        };
        $('#add-role-dialog').modal('hide');
        current_db.saveDoc(role, function(err, reponse) {
            role.key = role.name; // to keep the template rigt
            var data = {
                roles : [role]
            };
            $('.role-list').append(handlebars.templates['roles.html'](data, {}));
            $('#role-name').val('');
        });
    });


    $('.role-delete').live('click', function() {
       var me = $(this);
       var toDelete = {
           _id : $(this).data('id'),
           _rev : $(this).data('rev')
       };
       current_db.removeDoc(toDelete, function(err, response) {
            me.closest('tr').remove();
       });
    });

    $('.logout').live('click', function() {
        session.logout(function(err){
            if (err) return alert('There was a problem logging out');
            adjustUIforUser({});
        });


    });



    $('.timeago').each(function() {
       var textTime = $(this).attr('title');
       var date = Date.parse(textTime);
       var text = moment(date).fromNow();
       $(this).text(text);
       $(this).attr('title', moment(date).calendar());

    }).twipsy({placement: 'right'});

});



