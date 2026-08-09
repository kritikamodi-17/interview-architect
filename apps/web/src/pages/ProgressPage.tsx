import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { InterviewQuestion } from "@interview-architect/domain";
import { catalogModules, catalogQuestions, getModuleQuestions, getModuleTopics, getTopicQuestions, topicName } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { Icon } from "../components/Icon";
import { EmptyState, PageHeading, ProgressBar, StatCard, clampPercent } from "../components/shared";
import { QuestionCard } from "../components/QuestionCard";

function localTopicScore(topicId: string, questions: InterviewQuestion[], attempts: ReturnType<typeof useLearner>["attempts"]): number {
  const ids = new Set(questions.filter((question) => question.primaryTopicId === topicId).map((question) => question.id));
  const relevant = attempts.filter((attempt) => ids.has(attempt.questionId) && attempt.status === "completed" && attempt.selfScore !== undefined);
  if (!relevant.length) return 0;
  return clampPercent((relevant.reduce((sum, attempt) => sum + (attempt.selfScore ?? 0), 0) / relevant.length) * 25);
}

function prettyDate(value?: string): string {
  if (!value) return "Not yet practiced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function ProgressPage() {
  const { attempts, bookmarks, mastery, eraseStudyData } = useLearner();
  const [eraseState, setEraseState] = useState<"idle" | "confirming" | "deleting" | "success" | "error">("idle");
  const [eraseError, setEraseError] = useState<string>();
  const [freshSessionReady, setFreshSessionReady] = useState(true);
  const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
  const completedIds = useMemo(() => new Set(completedAttempts.map((attempt) => attempt.questionId)), [completedAttempts]);
  const savedQuestions = catalogQuestions.filter((question) => bookmarks.includes(question.id));
  const masteryByTopic = useMemo(() => new Map(mastery.map((entry) => [entry.topicId, entry])), [mastery]);
  const overallProgress = catalogQuestions.length ? (completedIds.size / catalogQuestions.length) * 100 : 0;
  const averageScore = completedAttempts.length
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.selfScore ?? 0), 0) / completedAttempts.length
    : 0;
  const topicsPracticed = new Set(
    catalogQuestions.filter((question) => completedIds.has(question.id)).map((question) => question.primaryTopicId)
  ).size;
  const reviewTopics = mastery.filter((entry) => entry.nextReviewAt && new Date(entry.nextReviewAt).getTime() <= Date.now());

  const confirmErase = async () => {
    setEraseState("deleting");
    setEraseError(undefined);
    try {
      const result = await eraseStudyData();
      setFreshSessionReady(result.sessionReady);
      setEraseState("success");
    } catch (error) {
      setEraseError(
        error instanceof Error && error.message
          ? `${error.message} Your current study data is still intact.`
          : "We could not erase your study data. Your current study data is still intact."
      );
      setEraseState("error");
    }
  };

  return (
    <div className="progress-page page-enter">
      <PageHeading
        eyebrow="Your learning signal"
        title="Progress is a trail of better decisions."
        description="Your notes remain in this browser. Completed self-reviews and bookmarks save to the study service when it is available; offline study data stays on this device."
        action={<Link className="button button--primary" to="/questions"><Icon name="play" size={16} />Practice next prompt</Link>}
      />

      <section className="progress-hero">
        <div className="progress-hero__main">
          <div><p className="eyebrow">Curriculum progress</p><strong>{Math.round(overallProgress)}%</strong><span>{completedIds.size} of {catalogQuestions.length} prompts practiced</span></div>
          <ProgressBar value={overallProgress} />
          <div className="progress-hero__note"><Icon name="sparkle" size={16} /><span>{completedIds.size ? "Keep making your tradeoffs explicit—repetition turns the pattern into instinct." : "Your first thoughtful review will create a personal study trail here."}</span></div>
        </div>
        <div className="progress-hero__ring" aria-label={`${Math.round(overallProgress)} percent of questions practiced`} style={{ "--progress": `${Math.round(overallProgress * 3.6)}deg` } as React.CSSProperties}><span>{completedIds.size}<small>done</small></span></div>
      </section>

      <section className="stats-grid stats-grid--progress">
        <StatCard icon="target" value={completedAttempts.length ? `${averageScore.toFixed(1)}/4` : "—"} label="Average self-score" detail="Across finished reviews" tone="dark" />
        <StatCard icon="layers" value={topicsPracticed} label="Topics practiced" detail={`of ${new Set(catalogQuestions.map((question) => question.primaryTopicId)).size} in the map`} tone="mint" />
        <StatCard icon="calendar" value={reviewTopics.length} label="Reviews due" detail={reviewTopics.length ? "A short revisit keeps it fresh" : "Your repetition queue is clear"} tone="cream" />
        <StatCard icon="bookmark" value={bookmarks.length} label="Saved prompts" detail="Your personal shortlist" tone="coral" />
      </section>

      <section className="progress-section">
        <div className="section-heading"><div><p className="eyebrow">Mastery by module</p><h2>See where to go deeper</h2></div><span className="section-heading__note">Self-assessment, not a grade</span></div>
        <div className="mastery-list">
          {catalogModules.map((module, index) => {
            const moduleQuestions = getModuleQuestions(module.id);
            const done = moduleQuestions.filter((question) => completedIds.has(question.id)).length;
            const moduleScore = moduleQuestions.length ? (done / moduleQuestions.length) * 100 : 0;
            return (
              <article className="mastery-module" key={module.id}>
                <div className="mastery-module__headline"><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{module.title}</h3><p>{done} of {moduleQuestions.length} prompts practiced</p></div><Link to={`/questions?module=${encodeURIComponent(module.id)}`} aria-label={`Practice ${module.title}`}><Icon name="arrow-right" size={18} /></Link></div>
                <ProgressBar value={moduleScore} />
                <div className="mastery-topics">{getModuleTopics(module.id).map((topic) => {
                  const remoteScore = masteryByTopic.get(topic.id)?.masteryScore;
                  const score = remoteScore ?? localTopicScore(topic.id, catalogQuestions, attempts);
                  const topicQuestions = getTopicQuestions(topic.id);
                  const topicDone = topicQuestions.filter((question) => completedIds.has(question.id)).length;
                  return <Link key={topic.id} to={`/questions?topic=${encodeURIComponent(topic.id)}`}><span>{topic.title}</span><span>{topicDone ? `${score}% signal` : "Not started"}<Icon name="chevron-right" size={14} /></span></Link>;
                })}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="progress-two-column">
        <section className="saved-section">
          <div className="section-heading section-heading--small"><div><p className="eyebrow">Your shortlist</p><h2>Saved for later</h2></div>{savedQuestions.length ? <Link to="/questions?status=saved" className="text-link">View all <Icon name="arrow-right" size={14} /></Link> : null}</div>
          {savedQuestions.length ? <div className="saved-question-list">{savedQuestions.slice(0, 3).map((question) => <QuestionCard key={question.id} question={question} compact />)}</div> : <EmptyState icon="bookmark" title="Nothing saved yet" description="Bookmark a prompt whenever you want to return with fresher eyes." actionTo="/questions" actionLabel="Explore prompts" />}
        </section>
        <section className="review-queue-card">
          <div className="section-heading section-heading--small"><div><p className="eyebrow">Spaced repetition</p><h2>Review queue</h2></div><Icon name="refresh" size={19} /></div>
          {reviewTopics.length ? <ul>{reviewTopics.slice(0, 4).map((entry) => <li key={entry.topicId}><span className="review-queue-card__icon"><Icon name="refresh" size={15} /></span><div><strong>{topicName(entry.topicId)}</strong><small>{entry.masteryScore}% mastery signal · due now</small></div><Link to={`/questions?topic=${encodeURIComponent(entry.topicId)}`} aria-label={`Review ${topicName(entry.topicId)}`}><Icon name="arrow-right" size={16} /></Link></li>)}</ul> : <div className="review-queue-card__empty"><span><Icon name="calendar" size={19} /></span><div><strong>No reviews due</strong><p>Finish a self-review and this space will surface the right time to revisit it.</p></div></div>}
        </section>
      </section>

      <section className="recent-attempts-section">
        <div className="section-heading"><div><p className="eyebrow">The work you have done</p><h2>Recent attempts</h2></div></div>
        {completedAttempts.length ? <div className="attempt-table" role="table" aria-label="Recent practice attempts"><div className="attempt-table__head" role="row"><span role="columnheader">Prompt</span><span role="columnheader">Topic</span><span role="columnheader">Self-score</span><span role="columnheader">Completed</span></div>{completedAttempts.slice().sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? "")).slice(0, 8).map((attempt) => { const question = catalogQuestions.find((item) => item.id === attempt.questionId); return question ? <Link to={`/questions/${question.slug}`} className="attempt-table__row" role="row" key={attempt.id}><span role="cell"><strong>{question.title}</strong><small>{attempt.durationSeconds ? `${Math.max(1, Math.round(attempt.durationSeconds / 60))} min practice` : "Practice review"}</small></span><span role="cell">{topicName(question.primaryTopicId)}</span><span role="cell"><b className={`attempt-score ${attempt.selfScore !== undefined ? `attempt-score--${Math.round(attempt.selfScore)}` : ""}`}>{attempt.selfScore ?? "—"}</b><small>/4</small></span><span role="cell">{prettyDate(attempt.completedAt)}<Icon name="chevron-right" size={16} /></span></Link> : null; })}</div> : <EmptyState icon="trend" title="Your progress starts with one practice session" description="Pick a prompt, make your tradeoffs explicit, and save an honest self-review." actionTo="/questions" actionLabel="Choose a prompt" />}
      </section>

      <section className="study-data-section" aria-labelledby="study-data-heading">
        <div className="study-data-section__icon"><Icon name="info" size={20} /></div>
        <div className="study-data-section__content">
          <p className="eyebrow">Privacy</p>
          <h2 id="study-data-heading">Your study data</h2>
          <p>Your practice history, self-reviews, mastery signals, and saved prompts are anonymous. You can permanently erase them from this browser and the study service at any time.</p>

          {eraseState === "idle" ? (
            <button
              className="button button--danger button--small"
              type="button"
              onClick={() => setEraseState("confirming")}
            >
              Erase study data
            </button>
          ) : null}

          {eraseState === "confirming" || eraseState === "deleting" ? (
            <div className="study-data-section__confirmation" id="erase-study-data-confirmation" role="group" aria-live="polite" aria-labelledby="erase-study-data-title">
              <strong id="erase-study-data-title">Erase all study data?</strong>
              <p>This cannot be undone. It permanently removes your local study trail and the anonymous record held by the study service.</p>
              <div className="study-data-section__actions">
                <button className="button button--secondary button--small" type="button" disabled={eraseState === "deleting"} onClick={() => setEraseState("idle")}>Cancel</button>
                <button className="button button--danger button--small" type="button" disabled={eraseState === "deleting"} onClick={() => void confirmErase()}>
                  {eraseState === "deleting" ? "Erasing study data…" : "Yes, erase study data"}
                </button>
              </div>
            </div>
          ) : null}

          {eraseState === "success" ? (
            <div className="study-data-section__feedback study-data-section__feedback--success" role="status" aria-live="polite">
              <Icon name="check" size={18} />
              <div>
                <strong>Your study data has been erased.</strong>
                <p>{freshSessionReady ? "A new, empty study space is ready when you are." : "Your empty study space is ready locally and will reconnect when the study service is available."}</p>
              </div>
              <button className="text-button text-button--quiet" type="button" onClick={() => setEraseState("idle")}>Dismiss</button>
            </div>
          ) : null}

          {eraseState === "error" ? (
            <div className="study-data-section__feedback study-data-section__feedback--error" role="alert">
              <Icon name="info" size={18} />
              <div><strong>We could not confirm erasure.</strong><p>{eraseError}</p></div>
              <div className="study-data-section__actions">
                <button className="text-button" type="button" onClick={() => void confirmErase()}>Try again</button>
                <button className="text-button text-button--quiet" type="button" onClick={() => setEraseState("idle")}>Cancel</button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
