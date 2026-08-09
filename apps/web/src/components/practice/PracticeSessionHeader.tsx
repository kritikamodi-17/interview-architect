import type { InterviewQuestion, PracticeAttempt, PracticeMode } from "@interview-architect/domain";
import { Link } from "react-router-dom";
import { moduleName, topicName } from "../../data/catalog";
import { Icon } from "../Icon";
import { DifficultyBadge, TypeBadge, formatDuration, formatMinutes } from "../shared";

interface PracticeSessionHeaderProps {
  question: InterviewQuestion;
  attempt: PracticeAttempt | null;
  mode: PracticeMode;
  requestedMode: PracticeMode;
  modeMismatch: boolean;
  elapsedSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  isStarting: boolean;
  syncStatus: "checking" | "online" | "offline" | "error";
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onStart: () => void;
  onToggleTimer: () => void;
  onRequestAbandon: () => void;
}

export function PracticeSessionHeader({
  question,
  attempt,
  mode,
  requestedMode,
  modeMismatch,
  elapsedSeconds,
  isRunning,
  isCompleted,
  isStarting,
  syncStatus,
  bookmarked,
  onToggleBookmark,
  onStart,
  onToggleTimer,
  onRequestAbandon
}: PracticeSessionHeaderProps): React.JSX.Element {
  const isMock = mode === "mock";
  const sessionState = isCompleted ? "Complete" : attempt ? (isRunning ? "Live" : "Paused") : "Ready";
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/questions">Question bank</Link><Icon name="chevron-right" size={14} /><Link to={`/questions?topic=${encodeURIComponent(question.primaryTopicId)}`}>{topicName(question.primaryTopicId)}</Link><Icon name="chevron-right" size={14} /><span aria-current="page">Design studio</span></nav>
      <header className="practice-header studio-session-header">
        <div className="practice-header__main">
          <div className="practice-header__tags"><DifficultyBadge difficulty={question.difficulty} /><TypeBadge type={question.type} /><span><Icon name="clock" size={15} />{formatMinutes(question.estimatedMinutes)}</span><span className={`studio-mode-badge studio-mode-badge--${mode}`}><Icon name={isMock ? "clock" : "lightbulb"} size={14} />{isMock ? "Mock" : "Learn"}</span></div>
          <p className="eyebrow">{moduleName(question.moduleId)} · {topicName(question.primaryTopicId)}</p>
          <h1>{question.title}</h1>
          {question.prompt.scenario ? <p className="practice-header__scenario">{question.prompt.scenario}</p> : null}
        </div>
        <button className={`bookmark-button bookmark-button--large${bookmarked ? " bookmark-button--saved" : ""}`} type="button" aria-label={bookmarked ? "Remove from saved prompts" : "Save this prompt"} aria-pressed={bookmarked} onClick={onToggleBookmark}><Icon name={bookmarked ? "bookmark-filled" : "bookmark"} size={20} /><span>{bookmarked ? "Saved" : "Save"}</span></button>
      </header>
      {modeMismatch ? <p className="studio-resume-notice" role="status"><Icon name="info" size={16} />This prompt already has a {mode === "mock" ? "Mock" : "Learn"} session in progress. Its saved mode takes priority over the requested {requestedMode} link.</p> : null}
      <section className="studio-session-controls" aria-label="Session controls">
        <div>
          <span className="studio-session-controls__timer-label"><Icon name="clock" size={17} />Elapsed time</span>
          <strong>{formatDuration(elapsedSeconds)}</strong>
          <small>{isMock ? "Mock time continues while this tab is open or in the background." : attempt ? "Timebox the explanation, not the learning." : `Designed for ${formatMinutes(question.estimatedMinutes)} of focused thinking.`}</small>
        </div>
        <div className="studio-session-controls__actions">
          <span className={`studio-session-state${isRunning ? " is-live" : ""}`}>{sessionState}</span>
          {!attempt && !isCompleted ? <button className="button button--primary" type="button" disabled={isStarting || syncStatus === "checking"} onClick={onStart}><Icon name="play" size={15} />{syncStatus === "checking" ? "Loading session…" : isStarting ? "Starting…" : "Start session"}</button> : null}
          {attempt?.status === "in_progress" && !isMock ? <button className="button button--secondary" type="button" onClick={onToggleTimer}>{isRunning ? "Pause timer" : "Resume timer"}</button> : null}
          {attempt?.status === "in_progress" ? <button className="text-button text-button--quiet" type="button" onClick={onRequestAbandon}>Discard session</button> : null}
        </div>
        <p className="studio-keyboard-help"><kbd>H</kbd> reveal a Learn hint <span>·</span><kbd>B</kbd> save this prompt</p>
      </section>
    </>
  );
}
