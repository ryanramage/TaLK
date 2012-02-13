var garden_app_support = require('garden-app-support');


$(function() {

    var header = $('.garden-app');
    var navBarHeight = 40;
    if (header.length == 0) {
        console.log('garden-app: No div found with "garden-app" class');
    } else {
        navBarHeight = header.height();
    }
    garden_app_support.navMenu($, {
        navBarHeight : navBarHeight
    })

});