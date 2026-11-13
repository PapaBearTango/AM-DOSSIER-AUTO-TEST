'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  allocateDossierNumber, formatDossierNumber, parseDossierNumber,
  isLegacyAanvraagnummer
} = require('../dossier-numbering.js');

// In-memory transactional simulator for unit tests only; never use in production.
function fakeAtomicStore() {
  const counters = new Map(), allocations = new Map();
  return {
    async allocate({ year, requestId, maxSequence }) {
      const key = year + ':' + requestId;
      if (allocations.has(key)) return allocations.get(key);
      const next = (counters.get(year) || 0) + 1;
      if (next > maxSequence) throw new RangeError('Annual sequence exhausted');
      counters.set(year, next);
      allocations.set(key, next);
      return next;
    },
    setYearCounter(year, value) { counters.set(year, value); }
  };
}

test('formats first and last valid sequence', () => {
  assert.equal(formatDossierNumber(2026, 1), 'AM260001');
  assert.equal(formatDossierNumber(2026, 9999), 'AM269999');
});
test('rejects invalid sequences', () => {
  assert.throws(() => formatDossierNumber(2026, 0), RangeError);
  assert.throws(() => formatDossierNumber(2026, 10000), RangeError);
});
test('legacy aanvraagnummer is not mistaken for a new dossier number', () => {
  assert.equal(isLegacyAanvraagnummer('AM2608-020'), true);
  assert.equal(parseDossierNumber('AM2608-020'), null);
  assert.deepEqual(parseDossierNumber('AM260158'), { year: 2026, sequence: 158 });
});
test('allocates once per request and returns same number on retry', async () => {
  const store = fakeAtomicStore(), now = new Date('2026-11-13T12:00:00Z');
  assert.equal(await allocateDossierNumber({ store, requestId: 'request_001', now }), 'AM260001');
  assert.equal(await allocateDossierNumber({ store, requestId: 'request_001', now }), 'AM260001');
  assert.equal(await allocateDossierNumber({ store, requestId: 'request_002', now }), 'AM260002');
});
test('resets yearly and retains existing identifiers', async () => {
  const store = fakeAtomicStore();
  assert.equal(await allocateDossierNumber({ store, requestId: 'request_001', now: new Date('2026-12-31T23:59:59Z') }), 'AM260001');
  assert.equal(await allocateDossierNumber({ store, requestId: 'request_002', now: new Date('2027-01-01T00:00:00Z') }), 'AM270001');
});
test('fails closed on exhausted annual sequence', async () => {
  const store = fakeAtomicStore(); store.setYearCounter(2026, 9999);
  await assert.rejects(allocateDossierNumber({
    store, requestId: 'request_003', now: new Date('2026-11-13T12:00:00Z')
  }), RangeError);
});
test('requires stable idempotency key and transactional store', async () => {
  await assert.rejects(allocateDossierNumber({ store: {}, requestId: 'request_004' }), TypeError);
  await assert.rejects(allocateDossierNumber({ store: fakeAtomicStore(), requestId: 'x' }), TypeError);
});
