-- Expired-session cleanup removes users only after checking whether another
-- active session exists. This index keeps that anti-join bounded as learner
-- state grows.
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
