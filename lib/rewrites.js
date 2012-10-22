/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/couchaudiorecorder/*', to: 'couchaudiorecorder/*'},
    {from: '/modules.js', to: 'modules.js' },
    {from: '/audio/:id/:attachment', to: '../../:id/:attachment'},
    { "description": "Access to this database" , "from": "_db" , "to"  : "../.." },
    { "from": "_db/*" , "to"  : "../../*" },
    { "description": "Access to this design document" , "from": "_ddoc" , "to"  : "" },
    { "from": "_ddoc/*" , "to"  : "*"},
    { "description": "Access to the main CouchDB API", "from": "_couchdb" , "to"  : "../../.."},
    { "from": "_couchdb/*" , "to"  : "../../../*"},
    {from: '/install', to: '_show/install'},
    {from: '/', to: 'index.html'},
    {from: '/_info', to: '_show/configInfo/_design/TaLK'},
    {from: '/', to: 'index.html'},
    {from: '/*', to: '*'}
];