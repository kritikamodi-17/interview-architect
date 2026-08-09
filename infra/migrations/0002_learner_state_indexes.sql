-- Query shapes used by the progress dashboard, review queue, and session lookup.
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempts_user_completed ON practice_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_question_version ON practice_attempts(question_id, question_version);
CREATE INDEX IF NOT EXISTS idx_mastery_user_review ON topic_mastery(user_id, next_review_at);
