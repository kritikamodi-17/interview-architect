import { Link } from "react-router-dom";
import type { InterviewQuestion, PracticeAttempt } from "@interview-architect/domain";
import { topicName } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { practiceModeLabel, practicePath } from "../lib/practice-route";
import { Icon } from "./Icon";
import { DifficultyBadge, TypeBadge, formatMinutes } from "./shared";

function newestInProgressAttempt(
  questionId: string,
  attempts: PracticeAttempt[]
): PracticeAttempt | undefined {
  return attempts
    .filter((attempt) => attempt.questionId === questionId && attempt.status === "in_progress")
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

export function QuestionCard({
  question,
  compact = false,
  showTopic = true,
  showLaunchControls = false,
  returnTo
}: {
  question: InterviewQuestion;
  compact?: boolean;
  showTopic?: boolean;
  /** Only the question bank opts into the explicit session launch controls. */
  showLaunchControls?: boolean;
  /** A URL-backed question-bank state to restore from the Studio breadcrumb. */
  returnTo?: string;
}) {
  const { bookmarks, attempts, toggleBookmark } = useLearner();
  const bookmarked = bookmarks.includes(question.id);
  const completed = attempts.some(
    (attempt) => attempt.questionId === question.id && attempt.status === "completed"
  );
  const activeAttempt = newestInProgressAttempt(question.id, attempts);
  const inProgress = Boolean(activeAttempt);
  const shortPrompt = question.prompt.question.replace(/\s+/g, " ");
  const launchControlsVisible = showLaunchControls && !compact;
  const defaultPath = practicePath(question.slug, activeAttempt?.mode ?? "learn", returnTo);

  return (
    <article className={`question-card${compact ? " question-card--compact" : ""}${launchControlsVisible ? " question-card--launchable" : ""}`}>
      <div className="question-card__topline">
        <div className="question-card__badges">
          <DifficultyBadge difficulty={question.difficulty} />
          <TypeBadge type={question.type} />
          {completed ? <span className="status-badge status-badge--done"><Icon name="check" size={13} />Practiced</span> : null}
          {inProgress ? <span className="status-badge"><Icon name="play" size={12} />In progress</span> : null}
        </div>
        <button
          className={`bookmark-button${bookmarked ? " bookmark-button--saved" : ""}`}
          type="button"
          aria-label={bookmarked ? `Remove ${question.title} from saved questions` : `Save ${question.title}`}
          aria-pressed={bookmarked}
          onClick={() => void toggleBookmark(question.id)}
        >
          <Icon name={bookmarked ? "bookmark-filled" : "bookmark"} size={18} />
        </button>
      </div>
      {showTopic ? <p className="question-card__topic">{topicName(question.primaryTopicId)}</p> : null}
      <h3><Link to={defaultPath}>{question.title}</Link></h3>
      {!compact ? <p className="question-card__excerpt">{shortPrompt}</p> : null}
      {launchControlsVisible ? <div className="question-card__launch" role="group" aria-label={`Practice options for ${question.title}`}>
        {activeAttempt ? <Link className="button button--primary question-card__resume" to={practicePath(question.slug, activeAttempt.mode, returnTo)} aria-label={`Resume ${practiceModeLabel(activeAttempt.mode)} session for ${question.title}`}><Icon name="play" size={15} />Resume {practiceModeLabel(activeAttempt.mode)} session</Link> : <>
          <Link className="button button--secondary" to={practicePath(question.slug, "learn", returnTo)} aria-label={`Start a Learn session for ${question.title}`}><Icon name="lightbulb" size={15} />Learn</Link>
          <Link className="button button--secondary" to={practicePath(question.slug, "mock", returnTo)} aria-label={`Start a Mock session for ${question.title}`}><Icon name="clock" size={15} />Mock</Link>
        </>}
      </div> : null}
      <div className="question-card__footer">
        <span><Icon name="clock" size={15} />{formatMinutes(question.estimatedMinutes)}</span>
        <span className="question-card__tags">{question.tags.slice(0, compact ? 1 : 2).map((tag) => <em key={tag}>#{tag}</em>)}</span>
        <Link className="question-card__open" to={defaultPath} aria-label={`Open ${question.title}${activeAttempt ? ` (${practiceModeLabel(activeAttempt.mode)} session in progress)` : ""}`}>
          <Icon name="arrow-right" size={17} />
        </Link>
      </div>
    </article>
  );
}
