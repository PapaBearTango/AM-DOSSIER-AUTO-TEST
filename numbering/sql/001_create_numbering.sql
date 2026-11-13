-- Apply in a dedicated PostgreSQL database. No existing Attio data is changed.
CREATE TABLE IF NOT EXISTS am_dossier_year_counters (
  year INTEGER PRIMARY KEY CHECK (year BETWEEN 2000 AND 2099),
  last_sequence INTEGER NOT NULL CHECK (last_sequence BETWEEN 0 AND 9999)
);

CREATE TABLE IF NOT EXISTS am_dossier_allocations (
  request_id VARCHAR(128) PRIMARY KEY,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 9999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, sequence)
);

-- The counter must be initialized only after reconciling real existing
-- dossier identifiers. Never infer the starting point from AMTEST messages.
