'use strict';

/**
 * PostgreSQL adapter for the central numbering service.
 * Supply an existing pg Pool. Never connect directly from an Outlook add-in.
 * This module intentionally has no database credentials.
 */
function createPostgresStore(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }
  return {
    async allocate({ year, requestId, maxSequence }) {
      if (!Number.isInteger(year) || year < 2000 || year > 2099 ||
          typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId) ||
          !Number.isInteger(maxSequence) || maxSequence < 1 || maxSequence > 9999) {
        throw new TypeError('Invalid allocation arguments');
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Fast path: existing idempotency key, even across year rollover.
        const existing = await client.query(
          'SELECT year, sequence FROM am_dossier_allocations WHERE request_id = $1',
          [requestId]
        );
        if (existing.rows.length) {
          await client.query('COMMIT');
          const row = existing.rows[0];
          return { year: Number(row.year), sequence: Number(row.sequence) };
        }
        // UPSERT locks the yearly row and serializes all allocations for that year.
        // A conflict on request_id later rolls back this counter increment.
        const counter = await client.query(
          `INSERT INTO am_dossier_year_counters (year, last_sequence)
           VALUES ($1, 1)
           ON CONFLICT (year) DO UPDATE
             SET last_sequence = am_dossier_year_counters.last_sequence + 1
           WHERE am_dossier_year_counters.last_sequence < $2
           RETURNING last_sequence`,
          [year, maxSequence]
        );
        if (!counter.rows.length) {
          throw new RangeError('Annual dossier sequence exhausted');
        }
        const sequence = Number(counter.rows[0].last_sequence);
        const inserted = await client.query(
          `INSERT INTO am_dossier_allocations (request_id, year, sequence)
           VALUES ($1, $2, $3)
           ON CONFLICT (request_id) DO NOTHING
           RETURNING year, sequence`,
          [requestId, year, sequence]
        );
        if (!inserted.rows.length) {
          // Concurrent request with the same key won; undo our increment.
          await client.query('ROLLBACK');
          const winner = await pool.query(
            'SELECT year, sequence FROM am_dossier_allocations WHERE request_id = $1',
            [requestId]
          );
          if (winner.rows.length !== 1) {
            throw new Error('Idempotency conflict: retry allocation');
          }
          return {
            year: Number(winner.rows[0].year),
            sequence: Number(winner.rows[0].sequence)
          };
        }
        await client.query('COMMIT');
        return { year, sequence };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { /* preserve original error */ }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

module.exports = { createPostgresStore };
