-- Learner state only. Curriculum records and written answer drafts deliberately
-- remain outside D1: catalog content is versioned in Git and answer text stays
-- in the learner's browser.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS anonymous_users (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES anonymous_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_version INTEGER NOT NULL CHECK (question_version > 0),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  self_score INTEGER CHECK (self_score IS NULL OR self_score BETWEEN 0 AND 4),
  FOREIGN KEY (user_id) REFERENCES anonymous_users(id) ON DELETE CASCADE,
  CHECK (
    (status = 'in_progress' AND completed_at IS NULL)
    OR (status IN ('completed', 'abandoned') AND completed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS attempt_rubric_scores (
  attempt_id TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (length(dimension) BETWEEN 1 AND 120),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 4),
  PRIMARY KEY (attempt_id, dimension),
  FOREIGN KEY (attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, question_id),
  FOREIGN KEY (user_id) REFERENCES anonymous_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_mastery (
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_score INTEGER NOT NULL CHECK (mastery_score BETWEEN 0 AND 100),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 4),
  attempts_count INTEGER NOT NULL CHECK (attempts_count >= 0),
  last_practiced_at TEXT,
  next_review_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, topic_id),
  FOREIGN KEY (user_id) REFERENCES anonymous_users(id) ON DELETE CASCADE
);
