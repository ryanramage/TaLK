var _ = require('underscore')._;
var handlebars = require('handlebars');
var garden_urls = require('lib/garden_urls');
var current_db = require('db').current();
var async = require('async');


$(function() {

    function errorLoadingInfo() {
        $('.loading').html(handlebars.templates['install_app_error.html']({}, {}));
    }


    var appurl  = $('.loading').data('appurl');
    var app_json_url = garden_urls.app_details_json(appurl);

    var db_name;
    var app_data;


    $.ajax({
        url : app_json_url + "?callback=?",
        dataType : 'json',
        jsonp : true,
        success : function(data) {
            app_data = data;
            try {
                app_data.src = appurl
                $('.loading').html(handlebars.templates['install_app_info.html'](app_data, {}));
                // check if this db has been taken
                $.couch.allDbs({
                    success : function(data) {
                        db_name = garden_urls.find_next_db_name(app_data.doc_id, data);
                        $('.form-actions').show();
                    }
                });


            } catch(e) {
                errorLoadingInfo();
            }
        },
        error : function() {
            errorLoadingInfo();
        }
    });


    function errorInstalling(){

    }

    function updateStatus(msg, percent, complete) {
        console.log(msg, percent, complete);
        $('.install-info h4').text(msg);
        $('.install-info .bar').css('width', percent);
        if (complete) {
            $('.install-info .progress').removeClass('active');
        }
    }


    $('.primary').live('click', function(){
        $('.form-actions').hide();
        $('.install-info').show();


       updateStatus('Installing App', '30%');
       $.couch.replicate(app_data.db_src, db_name, {
           success : function() {
                var db = $.couch.db(db_name);
                copyDoc(db);
           },
           error : errorInstalling
       }, {
          create_target:true,
          doc_ids : [app_data.doc_id]
       });


    })



    function copyDoc(db) {
       updateStatus('Cleaning up', '80%');
       db.copyDoc(
           app_data.doc_id,
           {
                error: errorInstalling,
                success: function() {
                    deleteDoc(db);
                }
           },
           {
                headers : {Destination : '_design/' + app_data.doc_id}
            }
        );
    }

    function deleteDoc(db) {
        updateStatus('Cleaning up', '90%');
        db.headDoc(app_data.doc_id, {}, {
            success : function(data, status, jqXHR) {
                updateStatus('Cleaning up', '95%');
                var rev = jqXHR.getResponseHeader('ETag').replace(/"/gi, '');
                console.log(rev);
                db.removeDoc({_id : app_data.doc_id, _rev : rev}, {
                    success :  saveAppDetails,
                    error : saveAppDetails
                });
            }
        });
    }

    function saveAppDetails() {
        updateStatus('Recording Install', '98%');
        app_data.installed  = {
            date : new Date().getTime(),
            db : db_name
        }
        app_data.dashboard_title = app_data.kanso.config.name;
        app_data.type = 'install';
        current_db.saveDoc(app_data, function() {
            updateStatus('Install Complete', '100%', true);

            var link = garden_urls.get_launch_url(app_data);

            $('.success')
                .attr('href', link)
                .show();

        });
    }


});