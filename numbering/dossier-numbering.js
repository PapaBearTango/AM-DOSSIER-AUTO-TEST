'use strict';

/**
 * Central AM dossier number allocator (dependency-injected).
 *
 * The store MUST implement an atomic transaction with a unique request key.
 * The production adapter must use a transactional database or equivalent
 * concurrency-safe conditional write. Do not use Outlook folder scans,
 * Attio maximum values, localStorage, or GitHub files as a counter.
 *
 * store.allocate({ year, requestId, maxSequence }) -> { year, sequence }
 *   - Returns the same sequence for retries with the same requestId.
 *   - Atomically increments the year counter for a new requestId.
 *   - Enforces a unique constraint on (year, sequence).
 *   - Fails without allocating when maxSequence is reached.
 */
const MAX_SEQUENCE = 9999;

function formatDossierNumber(year, sequence) {
  if (!Number.isInteger(year) || year < 2000 || year > 2099) {
    throw new RangeError('Year must be between 2000 and 2099');
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > MAX_SEQUENCE) {
    throw new RangeError('Sequence must be between 1 and 9999');
  }
  return 'AM' + String(year).slice(-2) + String(sequence).padStart(4, '0');
}

function parseDossierNumber(value) {
  const match = /^AM(\d{2})(\d{4})$/.exec(value || '');
  if (!match || Number(match[2]) === 0) return null;
  return { year: 2000 + Number(match[1]), sequence: Number(match[2]) };
}

function isLegacyAanvraagnummer(value) {
  return /^AM\d{4}-\d{3}$/.test(value || '');
}

async function allocateDossierNumber({ store, requestId, now = new Date() }) {
  if (!store || typeof store.allocate !== 'function') {
    throw new TypeError('A transactional store is required');
  }
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) {
    throw new TypeError('A stable, unique requestId (8-128 chars) is required');
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('A valid timestamp is required');
  }
  // UTC defines the rollover unambiguously; configure business timezone in
  // the production service if Belgian local midnight is the desired boundary.
  const year = now.getUTCFullYear();
  const allocation = await store.allocate({ year, requestId, maxSequence: MAX_SEQUENCE });
  if (!allocation || !Number.isInteger(allocation.year) || !Number.isInteger(allocation.sequence)) {
    throw new TypeError('Store must return { year, sequence }');
  }
  return formatDossierNumber(allocation.year, allocation.sequence);
}

module.exports = {
  MAX_SEQUENCE,
  formatDossierNumber,
  parseDossierNumber,
  isLegacyAanvraagnummer,
  allocateDossierNumber
};
