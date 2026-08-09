import { Link } from "react-router-dom";
import type { InterviewQuestion } from "@interview-architect/domain";
import { topicName } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { Icon } from "./Icon";
import { DifficultyBadge, TypeBadge, formatMinutes } from "./shared";

export function QuestionCard({
  question,
  compact = false,
  showTopic = true
}: {
  question: InterviewQuestion;
  compact?: boolean;
  showTopic?: boolean;
}) {
  const { bookmarks, attempts, toggleBookmark } = useLearner();
  const bookmarked = bookmarks.includes(question.id);
  const completed = attempts.some(
    (attempt) => attempt.questionId === question.id && attempt.status === "completed"
  );
  const inProgress = attempts.some(
    (attempt) => attempt.questionId === question.id && attempt.status === "in_progress"
  );
  const shortPrompt = question.prompt.question.replace(/\s+/g, " ");

  return (
    <article className={`question-card${compact ? " question-card--compact" : ""}`}>
      <div className="question-card__topline">
        <div className="question-card__badges">
          <DifficultyBadge difficulty={question.difficulty} />
          <TypeBadge type={question.type} />
          {completed ? <span className="status-badge status-badge--done"><Icon name="check" size={13} />Practiced</span> : null}
          {inProgress && !completed ? <span className="status-badge">In progress</span> : null}
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
      <h3><Link to={`/questions/${question.slug}`}>{question.title}</Link></h3>
      {!compact ? <p className="question-card__excerpt">{shortPrompt}</p> : null}
      <div className="question-card__footer">
        <span><Icon name="clock" size={15} />{formatMinutes(question.estimatedMinutes)}</span>
        <span className="question-card__tags">{question.tags.slice(0, compact ? 1 : 2).map((tag) => <em key={tag}>#{tag}</em>)}</span>
        <Link className="question-card__open" to={`/questions/${question.slug}`} aria-label={`Open ${question.title}`}>
          <Icon name="arrow-right" size={17} />
        </Link>
      </div>
    </article>
  );
}
