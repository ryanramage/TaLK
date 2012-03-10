/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/couchaudiorecorder/*', to: 'couchaudiorecorder/*'},
    {from: '/modules.js', to: 'modules.js' },
    {from: '/audio/:id/:attachment', to: '../../:id/:attachment'},
    {"from": "/_db/*", "to": "../../*" },
    {"from": "/_db", "to": "../.." },
    {from: '/install', to: '_show/install'},
    {from: '/', to: 'index.html'},
    {from: '/_info', to: '_show/configInfo/_design/TaLK'},
    {from: '*', to: '_show/not_found'}
];