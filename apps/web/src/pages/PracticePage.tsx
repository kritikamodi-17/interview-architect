import { useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { InterviewQuestion, PracticeMode } from "@interview-architect/domain";
import { InterviewerPanel } from "../components/practice/InterviewerPanel";
import { PracticeSessionHeader } from "../components/practice/PracticeSessionHeader";
import { SessionFeedback } from "../components/practice/SessionFeedback";
import { SessionModePicker } from "../components/practice/SessionModePicker";
import { StructuredWorkspace } from "../components/practice/StructuredWorkspace";
import { Icon } from "../components/Icon";
import { EmptyState, InlineError, formatMinutes } from "../components/shared";
import { catalogQuestions, moduleName, questionBySlug, topicName } from "../data/catalog";
import { usePracticeSession } from "../hooks/usePracticeSession";

function normalizedMode(value: string | null): PracticeMode {
  return value === "mock" ? "mock" : "learn";
}

function QuestionNotFound() {
  return <EmptyState icon="search" title="That prompt is not in the bank" description="It may have moved, or the link is incomplete." actionTo="/questions" actionLabel="Browse questions" />;
}

export function PracticePage() {
  const { slug } = useParams();
  const question = slug ? questionBySlug.get(slug) : undefined;
  if (!question) return <QuestionNotFound />;
  return <PracticeStudio question={question} />;
}

function PracticeStudio({ question }: { question: InterviewQuestion }): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get("mode");
  const requestedMode = normalizedMode(rawMode);

  useEffect(() => {
    if (rawMode === requestedMode) return;
    const next = new URLSearchParams(searchParams);
    next.set("mode", requestedMode);
    setSearchParams(next, { replace: true });
  }, [rawMode, requestedMode, searchParams, setSearchParams]);

  const setMode = (mode: PracticeMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", mode);
    setSearchParams(next);
  };

  const session = usePracticeSession(question, requestedMode);
  const sameModule = useMemo(() => catalogQuestions.filter((item) => item.moduleId === question.moduleId), [question.moduleId]);
  const position = sameModule.findIndex((item) => item.id === question.id);
  const nextQuestion = sameModule[(position + 1) % sameModule.length];
  const stage = session.isCompleted || session.isReviewOpen ? 3 : session.attempt ? 2 : 1;

  return (
    <div className="practice design-studio page-enter">
      <PracticeSessionHeader
        question={question}
        attempt={session.attempt}
        mode={session.mode}
        requestedMode={requestedMode}
        modeMismatch={session.modeMismatch}
        elapsedSeconds={session.elapsedSeconds}
        isRunning={session.isRunning}
        isCompleted={session.isCompleted}
        isStarting={session.isStarting}
        syncStatus={session.syncStatus}
        bookmarked={session.bookmarked}
        onToggleBookmark={() => void session.toggleBookmark()}
        onStart={() => void session.start()}
        onToggleTimer={session.toggleTimer}
        onRequestAbandon={session.requestAbandon}
      />

      <ol className="practice-steps" aria-label="Practice stages">
        <li className={stage >= 1 ? "is-current" : ""} aria-current={stage === 1 ? "step" : undefined}><span>1</span><div><strong>Read the brief</strong><small>Clarify the system</small></div></li>
        <li className={stage >= 2 ? "is-current" : ""} aria-current={stage === 2 ? "step" : undefined}><span>2</span><div><strong>Build the design</strong><small>Make your case</small></div></li>
        <li className={stage >= 3 ? "is-current" : ""} aria-current={stage === 3 ? "step" : undefined}><span>3</span><div><strong>Review the tradeoffs</strong><small>Score your reasoning</small></div></li>
      </ol>

      {session.error ? <div className="practice-action-error"><InlineError message={session.error} /></div> : null}

      <div className="practice-layout design-studio-layout">
        <article className="practice-brief">
          <section className="brief-card brief-card--question">
            <p className="eyebrow">The interview prompt</p>
            <h2>{question.prompt.question}</h2>
            {question.prompt.requirements?.length ? <div className="brief-list"><h3>What the interviewer needs</h3><ul>{question.prompt.requirements.map((requirement) => <li key={requirement}><Icon name="check" size={15} />{requirement}</li>)}</ul></div> : null}
            {question.prompt.constraints?.length ? <div className="brief-list brief-list--constraints"><h3>Constraints to respect</h3><ul>{question.prompt.constraints.map((constraint) => <li key={constraint}><Icon name="target" size={15} />{constraint}</li>)}</ul></div> : null}
          </section>

          {!session.attempt ? <SessionModePicker mode={requestedMode} onChange={setMode} onStart={() => void session.start()} isStarting={session.isStarting} disabled={session.syncStatus === "checking"} /> : <>
            <StructuredWorkspace sections={session.artifact.sections} saveState={session.saveState} onChange={session.updateSection} />
            <InterviewerPanel followUps={question.prompt.followUps} probes={session.artifact.probes} mode={session.mode} canAskNext={session.canRevealProbe} onRevealProbe={session.revealProbe} onResponseChange={session.updateProbeResponse} />
            <SessionFeedback
              question={question}
              mode={session.mode}
              isReviewOpen={session.isReviewOpen}
              isCompleted={session.isCompleted}
              isAwaitingRetry={session.isAwaitingRetry}
              isCompleting={session.isCompleting}
              answerRevealed={session.answerRevealed}
              hintsRevealed={session.hintsRevealed}
              rubricScores={session.rubricScores}
              selfScore={session.selfScore}
              missingDimensions={session.missingDimensions}
              feedback={session.feedback}
              canComplete={session.canComplete}
              onRevealHint={session.revealHint}
              onRevealAnswer={session.revealAnswer}
              onOpenReview={session.openReview}
              onRubricChange={session.setRubricScore}
              onSelfScoreChange={session.setSelfScore}
              onComplete={() => void session.complete()}
              onRetryCompletion={() => void session.retryCompletion()}
            />
            {session.isCompleted && !session.isAwaitingRetry ? <SessionModePicker mode={requestedMode} onChange={setMode} onStart={() => void session.startAnother()} isStarting={session.isStarting} disabled={session.syncStatus === "checking"} isResume /> : null}
          </>}

          {session.isAbandonConfirmationOpen ? <section className="studio-discard-confirm" aria-labelledby="discard-title"><p className="eyebrow">Private artifact deletion</p><h2 id="discard-title">Discard this session and its private notes?</h2><p>Progress for this attempt will be abandoned and its browser-only workspace, probes, and retry record will be removed.</p><div><button className="button button--danger" type="button" onClick={() => void session.confirmAbandon()}>Yes, discard session</button><button className="button button--secondary" type="button" onClick={session.cancelAbandon}>Keep working</button></div></section> : null}
        </article>

        <aside className="practice-sidebar">
          <section className="interview-frame"><p className="eyebrow">Interview frame</p><ul><li><Icon name="target" size={16} /><span><strong>Focus</strong>{topicName(question.primaryTopicId)}</span></li><li><Icon name="clock" size={16} /><span><strong>Timebox</strong>{formatMinutes(question.estimatedMinutes)}</span></li><li><Icon name="layers" size={16} /><span><strong>Format</strong>{question.type}</span></li></ul></section>
          <section className="sidebar-checklist"><p className="eyebrow">Before you finish</p><ul><li><Icon name="check" size={15} />State your assumptions</li><li><Icon name="check" size={15} />Draw the happy path</li><li><Icon name="check" size={15} />Name a failure mode</li><li><Icon name="check" size={15} />Explain the tradeoff</li></ul></section>
          <section className="studio-privacy-card"><Icon name="info" size={17} /><div><strong>Private by design</strong><p>Workspace notes and interviewer responses stay in this browser. Only your mode, elapsed time, and scores update progress.</p></div></section>
          {question.references.length ? <section className="reference-card"><p className="eyebrow">Keep learning</p>{question.references.map((reference) => <a href={reference.href} target="_blank" rel="noreferrer" key={reference.href}>{reference.label}<Icon name="arrow-up-right" size={14} /></a>)}</section> : null}
          {nextQuestion && nextQuestion.id !== question.id ? <section className="next-question-card"><p className="eyebrow">Up next in this module</p><strong>{nextQuestion.title}</strong><Link to={`/questions/${nextQuestion.slug}?mode=${session.mode}`}>Open next prompt <Icon name="arrow-right" size={14} /></Link></section> : null}
        </aside>
      </div>
    </div>
  );
}
