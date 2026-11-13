'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPostgresStore } = require('../postgres-store.js');

test('requires a pool and validates input before opening a connection', async () => {
  assert.throws(() => createPostgresStore(null), TypeError);
  let connections = 0;
  const store = createPostgresStore({ connect: async () => { connections++; } });
  await assert.rejects(store.allocate({ year: 2026, requestId: 'bad', maxSequence: 9999 }), TypeError);
  assert.equal(connections, 0);
});
test('uses transactional SQL and returns committed allocation', async () => {
  const statements = [];
  const client = {
    query: async (sql) => {
      statements.push(sql);
      if (sql.includes('SELECT year, sequence')) return { rows: [] };
      if (sql.includes('RETURNING last_sequence')) return { rows: [{ last_sequence: 1 }] };
      if (sql.includes('RETURNING year, sequence')) return { rows: [{ year: 2026, sequence: 1 }] };
      return { rows: [] };
    },
    release: () => statements.push('RELEASE')
  };
  const store = createPostgresStore({ connect: async () => client });
  assert.deepEqual(await store.allocate({ year: 2026, requestId: 'request_001', maxSequence: 9999 }), { year: 2026, sequence: 1 });
  assert.equal(statements[0], 'BEGIN');
  assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.at(-1), 'RELEASE');
});
test('rolls back if yearly sequence is exhausted', async () => {
  const statements = [];
  const client = {
    query: async sql => {
      statements.push(sql);
      if (sql.includes('SELECT year, sequence')) return { rows: [] };
      if (sql.includes('RETURNING last_sequence')) return { rows: [] };
      return { rows: [] };
    },
    release() {}
  };
  const store = createPostgresStore({ connect: async () => client });
  await assert.rejects(store.allocate({ year: 2026, requestId: 'request_002', maxSequence: 9999 }), RangeError);
  assert.ok(statements.includes('ROLLBACK'));
});
