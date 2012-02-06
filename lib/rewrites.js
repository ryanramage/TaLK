/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/couchaudiorecorder/*', to: 'couchaudiorecorder/*'},
    {from: '/modules.js', to: 'modules.js' },
    {"from": "/_db/*", "to": "../../*" },
    {"from": "/_db", "to": "../.." },
    {from: '/install', to: '_show/install'},
    {from: '/', to: 'index.html'},
    {from: '*', to: '_show/not_found'}
];