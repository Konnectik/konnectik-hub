'use strict';

// Passenger convention fallback. Hodifly is configured to start server.cjs,
// but some existing Passenger applications retain app.js as their startup
// file. Keeping this bridge CommonJS makes both configurations equivalent.
module.exports = require('./server.cjs');
