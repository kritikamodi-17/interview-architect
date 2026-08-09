-- Only one unfinished attempt may exist for a learner and question. The
-- partial index is also the concurrency primitive used by the API's
-- INSERT ... ON CONFLICT retry path.
--
-- Older local/preview databases may have duplicate in-progress rows from
-- before this invariant existed. Keep the latest one and mark older rows
-- abandoned so the index can be created without losing their audit metadata.
UPDATE practice_attempts AS stale
SET
  status = 'abandoned',
  completed_at = stale.started_at
WHERE stale.status = 'in_progress'
  AND EXISTS (
    SELECT 1
    FROM practice_attempts AS newer
    WHERE newer.user_id = stale.user_id
      AND newer.question_id = stale.question_id
      AND newer.status = 'in_progress'
      AND (
        newer.started_at > stale.started_at
        OR (newer.started_at = stale.started_at AND newer.id > stale.id)
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_attempts_one_in_progress_per_question
  ON practice_attempts(user_id, question_id)
  WHERE status = 'in_progress';
