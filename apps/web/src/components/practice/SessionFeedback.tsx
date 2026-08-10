import type { InterviewQuestion, PracticeMode, RubricDimension } from "@interview-architect/domain";
import type { PracticeFeedback } from "../../hooks/usePracticeSession";
import { Icon } from "../Icon";

function formattedAnswer(text: string): React.JSX.Element {
  const parts = text.split(/\n{2,}/).filter(Boolean);
  return <>{parts.map((part, index) => <p key={`${index}-${part.slice(0, 12)}`}>{part}</p>)}</>;
}

function scoreTone(score: number): string {
  if (score <= 1) return "score--needs-work";
  if (score === 2) return "score--developing";
  if (score === 3) return "score--strong";
  return "score--excellent";
}

function RubricScore({
  dimension,
  index,
  score,
  showGuide,
  readOnly = false,
  onChange
}: {
  dimension: RubricDimension;
  index: number;
  score?: number;
  showGuide: boolean;
  readOnly?: boolean;
  onChange: (score: number) => void;
}): React.JSX.Element {
  const key = dimension.dimension;
  return (
    <fieldset className={`rubric-score${readOnly ? " rubric-score--read-only" : ""}`}>
      <legend><span>0{index + 1}</span>{dimension.dimension}<small>{dimension.weight}% of the signal</small></legend>
      {showGuide ? <div className="rubric-score__prompt">Must mention: {dimension.mustMention.join(" · ")}</div> : <p className="rubric-score__mock-note">Use your own evidence first; score guidance unlocks after submission.</p>}
      <div className="score-options" role="radiogroup" aria-label={`Score for ${dimension.dimension}`}>
        {[0, 1, 2, 3, 4].map((value) => (
          <label className={score === value ? "is-selected" : ""} key={value}>
            <input type="radio" name={key} value={value} checked={score === value} disabled={readOnly} onChange={() => onChange(value)} />
            <span>{value}</span>
            {showGuide ? <small>{dimension.scoreGuide[value as 0 | 1 | 2 | 3 | 4]}</small> : <small className="sr-only">Score {value} out of 4</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface SessionFeedbackProps {
  question: InterviewQuestion;
  mode: PracticeMode;
  isReviewOpen: boolean;
  isCompleted: boolean;
  isAwaitingRetry: boolean;
  isCompleting: boolean;
  answerRevealed: boolean;
  hintsRevealed: number;
  rubricScores: Record<string, number>;
  selfScore: number | null;
  missingDimensions: string[];
  feedback?: PracticeFeedback;
  canComplete: boolean;
  onRevealHint: () => void;
  onRevealAnswer: () => void;
  onOpenReview: () => void;
  onRubricChange: (dimension: string, score: number) => void;
  onSelfScoreChange: (score: number) => void;
  onComplete: () => void;
  onRetryCompletion: () => void;
}

export function SessionFeedback({
  question,
  mode,
  isReviewOpen,
  isCompleted,
  isAwaitingRetry,
  isCompleting,
  answerRevealed,
  hintsRevealed,
  rubricScores,
  selfScore,
  missingDimensions,
  feedback,
  canComplete,
  onRevealHint,
  onRevealAnswer,
  onOpenReview,
  onRubricChange,
  onSelfScoreChange,
  onComplete,
  onRetryCompletion
}: SessionFeedbackProps): React.JSX.Element {
  const isLearn = mode === "learn";
  const showGuidance = isLearn || isCompleted;
  const showAnswer = (isLearn && answerRevealed) || isCompleted;
  const average = feedback?.average;
  const completionMessage = missingDimensions.length
    ? `${missingDimensions.length} rubric ${missingDimensions.length === 1 ? "dimension remains" : "dimensions remain"} unrated.`
    : selfScore === null ? "Choose your overall self-score to complete this session." : "Every rubric dimension is rated. Ready to complete.";

  return (
    <section className="session-feedback">
      {isLearn && !isCompleted ? <section className="hints-panel" aria-labelledby="hints-title">
        <div className="hints-panel__heading"><span><Icon name="lightbulb" size={18} /></span><div><p className="eyebrow">Progressive hints</p><h2 id="hints-title">Get unstuck without skipping the work</h2></div><small>Press <kbd>H</kbd></small></div>
        {hintsRevealed ? <ol className="hint-list">{question.hints.slice(0, hintsRevealed).map((hint, index) => <li key={hint}><span>{index + 1}</span>{hint}</li>)}</ol> : <p className="hints-panel__empty">No hints revealed yet. Try framing the workload, scale, and failure boundary first.</p>}
        {hintsRevealed < question.hints.length ? <button type="button" className="button button--secondary" onClick={onRevealHint}><Icon name="lightbulb" size={16} />Reveal hint {hintsRevealed + 1} of {question.hints.length}</button> : <span className="hints-panel__complete"><Icon name="check" size={15} />All hints revealed</span>}
      </section> : null}

      {!isReviewOpen && !isCompleted ? <section className="review-gate">
        <div><p className="eyebrow">When you are ready</p><h2>{isLearn ? "Compare your reasoning with the answer framework." : "End the mock, then score your reasoning."}</h2><p>{isLearn ? "Pause the timer, reveal the answer, and score the decisions you made—not just the final architecture." : "The model answer, pitfalls, and score guidance remain hidden until submission."}</p></div>
        <button type="button" className="button button--primary" onClick={isLearn ? onRevealAnswer : onOpenReview}>{isLearn ? "Reveal answer & rubric" : "Open self-review"}<Icon name="arrow-right" size={16} /></button>
      </section> : null}

      {showAnswer ? <section className="answer-framework" aria-labelledby="answer-title">
        <header><div><p className="eyebrow">Answer framework</p><h2 id="answer-title">A strong path through the problem</h2></div><span className="answer-framework__revealed"><Icon name="check" size={15} />{isCompleted && !isLearn ? "Unlocked after mock" : "Revealed"}</span></header>
        <div className="answer-summary">{formattedAnswer(question.answer.summary)}</div>
        <div className="answer-sections">{question.answer.sections.map((section) => <article key={section.heading}><h3>{section.heading}</h3><div>{formattedAnswer(section.markdown)}</div></article>)}</div>
        <div className="answer-supplements"><section><h3>Key terms</h3><div className="term-list">{question.answer.keyTerms.map((term) => <span key={term}>{term}</span>)}</div></section><section><h3>Tradeoffs to name</h3><ul>{question.answer.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></section><section><h3>Failure modes</h3><ul>{question.answer.failureModes.map((failure) => <li key={failure}>{failure}</li>)}</ul></section><section><h3>Interview pitfalls</h3><ul>{question.commonPitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul></section></div>
      </section> : null}

      {isReviewOpen || isCompleted ? <section className="rubric-panel" aria-labelledby="review-title">
        <header><div><p className="eyebrow">Self-review rubric</p><h2 id="review-title">Score the quality of your reasoning</h2><p>{showGuidance ? "Use the signal, not perfection. The goal is to see the next gap clearly." : "Trust your own evidence first. The detailed scoring guide unlocks after you submit."}</p></div>{average !== undefined ? <span className={`rubric-average ${scoreTone(Math.round(average))}`}>{average.toFixed(1)}<small>/4 rubric signal</small></span> : null}</header>
        {!isCompleted ? <><div className="rubric-list">{question.rubric.map((dimension, index) => <RubricScore dimension={dimension} index={index} key={dimension.dimension} score={rubricScores[dimension.dimension]} showGuide={showGuidance} onChange={(score) => onRubricChange(dimension.dimension, score)} />)}</div>
          <div className="self-score-panel"><div><p className="eyebrow">Overall reflection</p><h3>How would you rate this attempt?</h3><p>Keep it honest; this fuels your personal review queue.</p></div><div className="self-score-buttons" role="radiogroup" aria-label="Overall self-score">{[0, 1, 2, 3, 4].map((score) => <label key={score} className={selfScore === score ? "is-selected" : ""}><input type="radio" name="self-score" value={score} checked={selfScore === score} onChange={() => onSelfScoreChange(score)} /><strong>{score}</strong><span>{["Missed it", "Fragile", "Developing", "Strong", "Interview ready"][score]}</span></label>)}</div></div>
          <p className={`rubric-completion-status${canComplete ? " is-ready" : ""}`} id="rubric-completion-status" role="status">{completionMessage}</p>
          <button className="button button--primary button--wide" type="button" disabled={!canComplete} aria-describedby="rubric-completion-status" onClick={onComplete}>{isCompleting ? "Saving your review…" : "Complete session & update progress"}<Icon name="arrow-right" size={16} /></button>
        </> : <><div className="rubric-list rubric-list--completed">{question.rubric.map((dimension, index) => <RubricScore dimension={dimension} index={index} key={dimension.dimension} score={rubricScores[dimension.dimension]} showGuide={showGuidance} readOnly onChange={() => undefined} />)}</div><div className="review-saved" role="status"><span><Icon name="check" size={18} /></span><div><strong>{isAwaitingRetry ? "Review saved locally—sync still needs a retry." : "Review saved—nice work."}</strong><p>{isAwaitingRetry ? "The same completion request will be replayed safely when you retry." : "Your score will shape future review reminders. Your answer notes remain private on this device."}</p>{isAwaitingRetry ? <button className="button button--secondary button--small" type="button" onClick={onRetryCompletion}>Retry completion sync</button> : null}</div></div></>}
      </section> : null}

      {isCompleted && feedback ? <section className="studio-feedback-summary" aria-labelledby="feedback-title"><header><div><p className="eyebrow">Evidence-based feedback</p><h2 id="feedback-title">Your next improvement is visible now</h2></div><span>{feedback.average.toFixed(1)} / 4</span></header><div className="studio-feedback-summary__grid"><section><h3><Icon name="check" size={16} />Strengths</h3><ul>{feedback.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></section><section><h3><Icon name="target" size={16} />Gaps to close</h3><ul>{feedback.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></section></div><p className="studio-feedback-summary__next"><Icon name="arrow-right" size={16} /><span><strong>Next action</strong>{feedback.nextAction}</span></p></section> : null}
    </section>
  );
}
