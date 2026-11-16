'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiServer } = require('../api-server.js');

const token = 'local-test-token-with-at-least-32-characters';
async function withServer(fn) {
  let calls = 0;
  const store = { async allocate({ year }) { calls++; return { year, sequence: calls }; } };
  const server = createApiServer({ store, apiToken: token, clock: () => new Date('2026-11-16T08:00:00Z') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn('http://127.0.0.1:' + server.address().port, () => calls);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
test('rejects unauthorized allocation without touching store', async () => {
  await withServer(async (url, calls) => {
    const r = await fetch(url + '/v1/dossiers/allocate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: 'request_001', explicitUserAction: true })
    });
    assert.equal(r.status, 401);
    assert.equal(calls(), 0);
  });
});
test('rejects automatic allocation without explicit user action', async () => {
  await withServer(async (url, calls) => {
    const r = await fetch(url + '/v1/dossiers/allocate', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: 'request_001' })
    });
    assert.equal(r.status, 400);
    assert.equal(calls(), 0);
  });
});
test('allocates a number on authorized explicit request', async () => {
  await withServer(async url => {
    const r = await fetch(url + '/v1/dossiers/allocate', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: 'request_001', explicitUserAction: true })
    });
    assert.equal(r.status, 201);
    assert.deepEqual(await r.json(), { dossierNumber: 'AM260001' });
  });
});
test('health check does not allocate', async () => {
  await withServer(async (url, calls) => {
    assert.equal((await fetch(url + '/health')).status, 200);
    assert.equal(calls(), 0);
  });
});
