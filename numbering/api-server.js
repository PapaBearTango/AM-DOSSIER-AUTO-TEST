'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const { allocateDossierNumber } = require('./dossier-numbering.js');

const MAX_BODY_BYTES = 4096;
function validBearer(header, secret) {
  if (typeof secret !== 'string' || secret.length < 32 ||
      typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7), 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function createApiServer({ store, apiToken, clock = () => new Date() }) {
  if (!store || typeof store.allocate !== 'function') throw new TypeError('Transactional store required');
  if (typeof apiToken !== 'string' || apiToken.length < 32) {
    throw new TypeError('API token must be at least 32 characters');
  }
  return http.createServer(async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/health' && req.method === 'GET') {
      return send(200, { status: 'ok', service: 'am-numbering' });
    }
    if (req.url !== '/v1/dossiers/allocate' || req.method !== 'POST') {
      return send(404, { error: 'not_found' });
    }
    if (!validBearer(req.headers.authorization, apiToken)) {
      return send(401, { error: 'unauthorized' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      return send(415, { error: 'unsupported_media_type' });
    }
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk.toString('utf8');
        if (Buffer.byteLength(body) > MAX_BODY_BYTES) return send(413, { error: 'payload_too_large' });
      }
      const payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
          payload.explicitUserAction !== true) {
        return send(400, { error: 'explicit_user_action_required' });
      }
      // A stable request ID must originate from the authenticated backend
      // workflow, not an arbitrary unauthenticated client.
      const number = await allocateDossierNumber({
        store, requestId: payload.requestId, now: clock()
      });
      return send(201, { dossierNumber: number });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return send(400, { error: 'invalid_request' });
      }
      if (error instanceof RangeError) return send(409, { error: 'sequence_exhausted' });
      // Do not leak SQL errors or credentials.
      console.error('Number allocation failed:', error.message);
      return send(503, { error: 'allocation_unavailable' });
    }
  });
}

module.exports = { createApiServer };
