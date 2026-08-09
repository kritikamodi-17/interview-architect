import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PracticeAttempt, RubricDimension } from "@interview-architect/domain";
import { catalogQuestions, moduleName, questionBySlug, topicName } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { Icon } from "../components/Icon";
import {
  DifficultyBadge,
  EmptyState,
  InlineError,
  TypeBadge,
  formatDuration,
  formatMinutes
} from "../components/shared";

function answerKey(dimension: RubricDimension): string {
  // The Worker validates rubric entries against the editorial dimension name.
  // Keeping that identifier end-to-end avoids a fragile UI-only surrogate key.
  return dimension.dimension;
}

function getDraftKey(questionId: string): string {
  return `interview-architect:draft:${questionId}`;
}

function readDraft(questionId: string): string {
  try {
    return window.localStorage.getItem(getDraftKey(questionId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(questionId: string, draft: string): void {
  try {
    window.localStorage.setItem(getDraftKey(questionId), draft);
  } catch {
    // Draft persistence is an enhancement; a disabled storage area must not block practice.
  }
}

function activeAttemptFor(questionId: string, attempts: PracticeAttempt[]): PracticeAttempt | undefined {
  return attempts
    .filter((attempt) => attempt.questionId === questionId && attempt.status === "in_progress")
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

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
  onChange
}: {
  dimension: RubricDimension;
  index: number;
  score?: number;
  onChange: (score: number) => void;
}) {
  const key = answerKey(dimension);
  return (
    <fieldset className="rubric-score">
      <legend><span>0{index + 1}</span>{dimension.dimension}<small>{dimension.weight}% of the signal</small></legend>
      <div className="rubric-score__prompt">Must mention: {dimension.mustMention.join(" · ")}</div>
      <div className="score-options" role="radiogroup" aria-label={`Score for ${dimension.dimension}`}>
        {[0, 1, 2, 3, 4].map((value) => (
          <label className={score === value ? "is-selected" : ""} key={value}>
            <input
              type="radio"
              name={key}
              value={value}
              checked={score === value}
              onChange={() => onChange(value)}
            />
            <span>{value}</span>
            <small>{dimension.scoreGuide[value as 0 | 1 | 2 | 3 | 4]}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function QuestionNotFound() {
  return <EmptyState icon="search" title="That prompt is not in the bank" description="It may have moved, or the link is incomplete." actionTo="/questions" actionLabel="Browse questions" />;
}

export function PracticePage() {
  const { slug } = useParams();
  const question = slug ? questionBySlug.get(slug) : undefined;
  const { attempts, bookmarks, syncStatus, startAttempt, completeAttempt, abandonAttempt, toggleBookmark } = useLearner();
  const existingAttempt = question ? activeAttemptFor(question.id, attempts) : undefined;
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(existingAttempt ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(Boolean(existingAttempt));
  const [starting, setStarting] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [draft, setDraft] = useState(() => (question ? readDraft(question.id) : ""));
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState<string>();
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    if (!question) return;
    const active = activeAttemptFor(question.id, attempts);
    setAttempt(active ?? null);
    setElapsedSeconds(active ? Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)) : 0);
    setIsRunning(Boolean(active));
    setHintsRevealed(0);
    setAnswerRevealed(false);
    setDraft(readDraft(question.id));
    setRubricScores({});
    setSelfScore(null);
    setReviewError(undefined);
    setReviewSaved(false);
    window.scrollTo(0, 0);
  }, [question?.id]);

  // Progress loads after the route can render. Adopt an already-open remote
  // attempt when it arrives instead of offering a second start for the same
  // question.
  useEffect(() => {
    if (!question || attempt || reviewSaved) return;
    const active = activeAttemptFor(question.id, attempts);
    if (!active) return;

    setAttempt(active);
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)));
    setIsRunning(true);
  }, [attempt, attempts, question, reviewSaved]);

  useEffect(() => {
    if (!question) return;
    writeDraft(question.id, draft);
  }, [draft, question]);

  useEffect(() => {
    if (!isRunning || reviewSaved) return;
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [isRunning, reviewSaved]);

  const revealHint = useCallback(() => {
    if (!question) return;
    setHintsRevealed((current) => Math.min(question.hints.length, current + 1));
  }, [question]);

  useEffect(() => {
    if (!question) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (editing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLocaleLowerCase() === "h" && hintsRevealed < question.hints.length) {
        event.preventDefault();
        revealHint();
      }
      if (event.key.toLocaleLowerCase() === "b") {
        event.preventDefault();
        void toggleBookmark(question.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, hintsRevealed, revealHint, toggleBookmark]);

  const weightedRubricScore = useMemo(() => {
    if (!question) return null;
    const scored = question.rubric.filter((dimension) => rubricScores[answerKey(dimension)] !== undefined);
    if (!scored.length) return null;
    const totalWeight = scored.reduce((sum, dimension) => sum + dimension.weight, 0);
    return scored.reduce((sum, dimension) => {
      return sum + (rubricScores[answerKey(dimension)] ?? 0) * dimension.weight;
    }, 0) / totalWeight;
  }, [question, rubricScores]);

  if (!question) return <QuestionNotFound />;

  const bookmarked = bookmarks.includes(question.id);
  const sameModule = catalogQuestions.filter((item) => item.moduleId === question.moduleId);
  const position = sameModule.findIndex((item) => item.id === question.id);
  const nextQuestion = sameModule[(position + 1) % sameModule.length];
  const stage = reviewSaved ? 3 : answerRevealed ? 3 : attempt ? 2 : 1;

  const beginPractice = async () => {
    if (attempt || starting) {
      setIsRunning(true);
      return;
    }
    if (syncStatus === "checking") {
      setReviewError("Your existing practice session is still loading. Try again in a moment.");
      return;
    }
    setStarting(true);
    setReviewError(undefined);
    try {
      const created = await startAttempt(question.id, question.version);
      setAttempt(created);
      setElapsedSeconds(0);
      setIsRunning(true);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "The study service could not start this attempt.");
    } finally {
      setStarting(false);
    }
  };

  const revealAnswer = () => {
    setAnswerRevealed(true);
    setIsRunning(false);
  };

  const handleSaveReview = async () => {
    if (selfScore === null) {
      setReviewError("Choose an overall self-score before saving your review.");
      return;
    }
    if (syncStatus === "checking") {
      setReviewError("Your existing practice session is still loading. Try again in a moment.");
      return;
    }
    setReviewError(undefined);
    setStarting(true);
    try {
      let workingAttempt = attempt;
      if (!workingAttempt) {
        workingAttempt = await startAttempt(question.id, question.version);
        setAttempt(workingAttempt);
      }
      const saved = await completeAttempt(workingAttempt, {
        durationSeconds: Math.max(1, elapsedSeconds),
        selfScore,
        rubricScores
      });
      setAttempt(saved);
      setIsRunning(false);
      setReviewSaved(true);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "The study service could not save your review.");
    } finally {
      setStarting(false);
    }
  };

  const handleAbandon = async () => {
    if (!attempt || reviewSaved) return;
    setReviewError(undefined);
    try {
      await abandonAttempt(attempt, elapsedSeconds);
      setAttempt(null);
      setIsRunning(false);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "The study service could not discard this attempt.");
    }
  };

  return (
    <div className="practice page-enter">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/questions">Question bank</Link><Icon name="chevron-right" size={14} /><Link to={`/questions?topic=${encodeURIComponent(question.primaryTopicId)}`}>{topicName(question.primaryTopicId)}</Link><Icon name="chevron-right" size={14} /><span aria-current="page">Practice</span></nav>

      <header className="practice-header">
        <div className="practice-header__main">
          <div className="practice-header__tags"><DifficultyBadge difficulty={question.difficulty} /><TypeBadge type={question.type} /><span><Icon name="clock" size={15} />{formatMinutes(question.estimatedMinutes)}</span></div>
          <p className="eyebrow">{moduleName(question.moduleId)} · {topicName(question.primaryTopicId)}</p>
          <h1>{question.title}</h1>
          {question.prompt.scenario ? <p className="practice-header__scenario">{question.prompt.scenario}</p> : null}
        </div>
        <button
          className={`bookmark-button bookmark-button--large${bookmarked ? " bookmark-button--saved" : ""}`}
          type="button"
          aria-label={bookmarked ? "Remove from saved prompts" : "Save this prompt"}
          aria-pressed={bookmarked}
          onClick={() => void toggleBookmark(question.id)}
        ><Icon name={bookmarked ? "bookmark-filled" : "bookmark"} size={20} /><span>{bookmarked ? "Saved" : "Save"}</span></button>
      </header>

      <ol className="practice-steps" aria-label="Practice stages">
        <li className={stage >= 1 ? "is-current" : ""}><span>1</span><div><strong>Read the brief</strong><small>Clarify the system</small></div></li>
        <li className={stage >= 2 ? "is-current" : ""}><span>2</span><div><strong>Think it through</strong><small>Make your case</small></div></li>
        <li className={stage >= 3 ? "is-current" : ""}><span>3</span><div><strong>Review the tradeoffs</strong><small>Score your reasoning</small></div></li>
      </ol>

      {reviewError ? <div className="practice-action-error"><InlineError message={reviewError} /></div> : null}

      <div className="practice-layout">
        <article className="practice-brief">
          <section className="brief-card brief-card--question">
            <p className="eyebrow">The interview prompt</p>
            <h2>{question.prompt.question}</h2>
            {question.prompt.requirements?.length ? <div className="brief-list"><h3>What the interviewer needs</h3><ul>{question.prompt.requirements.map((requirement) => <li key={requirement}><Icon name="check" size={15} />{requirement}</li>)}</ul></div> : null}
            {question.prompt.constraints?.length ? <div className="brief-list brief-list--constraints"><h3>Constraints to respect</h3><ul>{question.prompt.constraints.map((constraint) => <li key={constraint}><Icon name="target" size={15} />{constraint}</li>)}</ul></div> : null}
          </section>

          <section className="practice-canvas" aria-labelledby="canvas-title">
            <div className="practice-canvas__head"><div><p className="eyebrow">Your thinking space</p><h2 id="canvas-title">Sketch your answer</h2></div><span><Icon name="info" size={15} />Stored only on this device</span></div>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Start with the assumptions you would clarify, then outline the design, data flow, failure modes, and tradeoffs…" aria-label="Your private answer notes" />
            <div className="practice-canvas__footer"><span>{draft.trim() ? `${draft.trim().split(/\s+/).length} words` : "Your notes stay private"}</span><span>Tip: say the tradeoff before the component.</span></div>
          </section>

          <section className="hints-panel" aria-labelledby="hints-title">
            <div className="hints-panel__heading"><span><Icon name="lightbulb" size={18} /></span><div><p className="eyebrow">Progressive hints</p><h2 id="hints-title">Get unstuck without skipping the work</h2></div><small>Press <kbd>H</kbd></small></div>
            {hintsRevealed ? <ol className="hint-list">{question.hints.slice(0, hintsRevealed).map((hint, index) => <li key={hint}><span>{index + 1}</span>{hint}</li>)}</ol> : <p className="hints-panel__empty">No hints revealed yet. Try framing the workload, scale, and failure boundary first.</p>}
            {hintsRevealed < question.hints.length ? <button type="button" className="button button--secondary" onClick={revealHint}><Icon name="lightbulb" size={16} />Reveal hint {hintsRevealed + 1} of {question.hints.length}</button> : <span className="hints-panel__complete"><Icon name="check" size={15} />All hints revealed</span>}
          </section>

          {!answerRevealed ? (
            <section className="review-gate">
              <div><p className="eyebrow">When you are ready</p><h2>Compare your reasoning with the answer framework.</h2><p>Pause the timer, reveal the answer, and score the choices you made—not just the final architecture.</p></div>
              <button type="button" className="button button--primary" onClick={revealAnswer}>Reveal answer & rubric <Icon name="arrow-right" size={16} /></button>
            </section>
          ) : (
            <section className="answer-framework" aria-labelledby="answer-title">
              <header><div><p className="eyebrow">Answer framework</p><h2 id="answer-title">A strong path through the problem</h2></div><span className="answer-framework__revealed"><Icon name="check" size={15} />Revealed</span></header>
              <div className="answer-summary">{formattedAnswer(question.answer.summary)}</div>
              <div className="answer-sections">{question.answer.sections.map((section) => <article key={section.heading}><h3>{section.heading}</h3><div>{formattedAnswer(section.markdown)}</div></article>)}</div>
              <div className="answer-supplements"><section><h3>Key terms</h3><div className="term-list">{question.answer.keyTerms.map((term) => <span key={term}>{term}</span>)}</div></section><section><h3>Tradeoffs to name</h3><ul>{question.answer.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></section><section><h3>Failure modes</h3><ul>{question.answer.failureModes.map((failure) => <li key={failure}>{failure}</li>)}</ul></section><section><h3>Interview pitfalls</h3><ul>{question.commonPitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul></section></div>
            </section>
          )}

          {answerRevealed ? (
            <section className="rubric-panel" aria-labelledby="rubric-title">
              <header><div><p className="eyebrow">Self-review rubric</p><h2 id="rubric-title">Score the quality of your reasoning</h2><p>Use the signal, not perfection. The goal is to see the next gap clearly.</p></div>{weightedRubricScore !== null ? <span className={`rubric-average ${scoreTone(Math.round(weightedRubricScore))}`}>{weightedRubricScore.toFixed(1)}<small>/4 rubric signal</small></span> : null}</header>
              <div className="rubric-list">{question.rubric.map((dimension, index) => <RubricScore dimension={dimension} index={index} key={dimension.dimension} score={rubricScores[answerKey(dimension)]} onChange={(value) => setRubricScores((current) => ({ ...current, [answerKey(dimension)]: value }))} />)}</div>
              <div className="self-score-panel"><div><p className="eyebrow">Overall reflection</p><h3>How would you rate this attempt?</h3><p>Keep it honest; this fuels your personal review queue.</p></div><div className="self-score-buttons" role="radiogroup" aria-label="Overall self-score">{[0, 1, 2, 3, 4].map((score) => <label key={score} className={selfScore === score ? "is-selected" : ""}><input type="radio" name="self-score" value={score} checked={selfScore === score} onChange={() => setSelfScore(score)} /><strong>{score}</strong><span>{["Missed it", "Fragile", "Developing", "Strong", "Interview ready"][score]}</span></label>)}</div></div>
              {reviewSaved ? <div className="review-saved" role="status"><span><Icon name="check" size={18} /></span><div><strong>Review saved—nice work.</strong><p>Your score will shape future review reminders. Your answer notes remain private on this device.</p></div></div> : <button className="button button--primary button--wide" type="button" disabled={starting || syncStatus === "checking"} onClick={() => void handleSaveReview()}>{syncStatus === "checking" ? "Loading session…" : starting ? "Saving your review…" : "Save review & update progress"}<Icon name="arrow-right" size={16} /></button>}
            </section>
          ) : null}

          {question.prompt.followUps.length ? <section className="follow-ups"><p className="eyebrow">Stretch the answer</p><h2>Likely follow-up questions</h2><ol>{question.prompt.followUps.map((followUp, index) => <li key={followUp}><span>{String(index + 1).padStart(2, "0")}</span>{followUp}</li>)}</ol></section> : null}
        </article>

        <aside className="practice-sidebar">
          <section className="timer-card" aria-label="Practice timer">
            <div className="timer-card__top"><span><Icon name="clock" size={18} />Practice timer</span><span className={isRunning ? "timer-live" : ""}>{isRunning ? "Live" : attempt ? "Paused" : "Ready"}</span></div>
            <strong>{formatDuration(elapsedSeconds)}</strong>
            <p>{attempt ? "Timebox the explanation, not the learning." : `Designed for ${formatMinutes(question.estimatedMinutes)} of focused thinking.`}</p>
            {!reviewSaved ? <div className="timer-card__actions">{!attempt ? <button className="button button--primary" type="button" disabled={starting || syncStatus === "checking"} onClick={() => void beginPractice()}><Icon name="play" size={15} />{syncStatus === "checking" ? "Loading session…" : starting ? "Starting…" : "Start timer"}</button> : <button className="button button--secondary" type="button" onClick={() => setIsRunning((current) => !current)}>{isRunning ? "Pause timer" : "Resume timer"}</button>}{attempt ? <button className="text-button text-button--quiet" type="button" onClick={() => void handleAbandon()}>Discard attempt</button> : null}</div> : null}
          </section>
          <section className="interview-frame"><p className="eyebrow">Interview frame</p><ul><li><Icon name="target" size={16} /><span><strong>Focus</strong>{topicName(question.primaryTopicId)}</span></li><li><Icon name="clock" size={16} /><span><strong>Timebox</strong>{formatMinutes(question.estimatedMinutes)}</span></li><li><Icon name="layers" size={16} /><span><strong>Format</strong>{question.type}</span></li></ul></section>
          <section className="sidebar-checklist"><p className="eyebrow">Before you finish</p><ul><li><Icon name="check" size={15} />State your assumptions</li><li><Icon name="check" size={15} />Draw the happy path</li><li><Icon name="check" size={15} />Name a failure mode</li><li><Icon name="check" size={15} />Explain the tradeoff</li></ul></section>
          {question.references.length ? <section className="reference-card"><p className="eyebrow">Keep learning</p>{question.references.map((reference) => <a href={reference.href} target="_blank" rel="noreferrer" key={reference.href}>{reference.label}<Icon name="arrow-up-right" size={14} /></a>)}</section> : null}
          {nextQuestion && nextQuestion.id !== question.id ? <section className="next-question-card"><p className="eyebrow">Up next in this module</p><strong>{nextQuestion.title}</strong><Link to={`/questions/${nextQuestion.slug}`}>Open next prompt <Icon name="arrow-right" size={14} /></Link></section> : null}
        </aside>
      </div>
    </div>
  );
}
