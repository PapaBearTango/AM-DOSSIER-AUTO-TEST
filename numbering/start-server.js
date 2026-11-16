'use strict';
// DEVELOPMENT ONLY. Do not expose this process to the internet.
// Production requires TLS termination, identity-based authentication,
// per-user authorization, rate limiting, auditing and secret management.
const { Pool } = require('pg');
const { createPostgresStore } = require('./postgres-store.js');
const { createApiServer } = require('./api-server.js');

if (process.env.AM_ALLOW_DEV_SERVER !== 'yes') {
  throw new Error('Refusing to start without AM_ALLOW_DEV_SERVER=yes');
}
if (!process.env.DATABASE_URL || !process.env.AM_API_TOKEN) {
  throw new Error('DATABASE_URL and AM_API_TOKEN are required');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = createApiServer({
  store: createPostgresStore(pool),
  apiToken: process.env.AM_API_TOKEN
});
const port = Number(process.env.PORT || 8787);
server.listen(port, '127.0.0.1', () => {
  console.log('Development numbering API listening on localhost:' + port);
});
