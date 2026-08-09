-- The Design Studio retains only non-sensitive session metadata in D1. Free
-- form workspace content stays in browser storage and never appears here.
ALTER TABLE practice_attempts
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'learn' CHECK (mode IN ('learn', 'mock'));

-- A receipt makes a completed-attempt retry replay the original response. The
-- request hash protects against reusing an operation key for different input.
CREATE TABLE IF NOT EXISTS mutation_receipts (
  user_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  http_status INTEGER NOT NULL CHECK (http_status BETWEEN 200 AND 299),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (user_id, operation_key),
  FOREIGN KEY (user_id) REFERENCES anonymous_users(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE
);

-- Bounded retention cleanup uses this index so routine session checks avoid a
-- full-table receipt scan.
CREATE INDEX IF NOT EXISTS idx_mutation_receipts_expiry
  ON mutation_receipts(expires_at);
