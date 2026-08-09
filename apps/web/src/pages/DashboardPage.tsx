import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CoachRecommendation, CoachRequest, InterviewQuestion, PracticeAttempt } from "@interview-architect/domain";
import { api, type ReviewQueueItem } from "../lib/api";
import {
  catalogModules,
  catalogQuestions,
  getModuleQuestions,
  getModuleTopics,
  topicName
} from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { practiceModeLabel, practicePath } from "../lib/practice-route";
import { Icon } from "../components/Icon";
import {
  DifficultyBadge,
  EmptyState,
  PageHeading,
  ProgressBar,
  StatCard,
  formatMinutes
} from "../components/shared";

function completedQuestionIds(attempts: ReturnType<typeof useLearner>["attempts"]): Set<string> {
  return new Set(
    attempts.filter((attempt) => attempt.status === "completed").map((attempt) => attempt.questionId)
  );
}

function newestInProgressAttempt(
  attempts: PracticeAttempt[],
  questionId?: string
): PracticeAttempt | undefined {
  return attempts
    .filter((attempt) => attempt.status === "in_progress" && (!questionId || attempt.questionId === questionId))
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

function questionForReviewItem(item: ReviewQueueItem): InterviewQuestion | undefined {
  const id = typeof item.question === "string" ? item.question : item.question.id;
  return catalogQuestions.find((question) => question.id === id);
}

function localReviewQuestion(
  mastery: ReturnType<typeof useLearner>["mastery"],
  attempts: ReturnType<typeof useLearner>["attempts"]
): InterviewQuestion | undefined {
  const nextTopic = mastery
    .filter((entry) => entry.nextReviewAt && new Date(entry.nextReviewAt).getTime() <= Date.now())
    .sort((left, right) => (left.nextReviewAt ?? "").localeCompare(right.nextReviewAt ?? ""))[0];
  if (!nextTopic) return undefined;

  const completed = completedQuestionIds(attempts);
  const candidates = catalogQuestions.filter((question) => question.primaryTopicId === nextTopic.topicId);
  return candidates.find((question) => !completed.has(question.id)) ?? candidates[0];
}

function chooseLocalRecommendation(
  questions: InterviewQuestion[],
  completed: Set<string>,
  availableMinutes: number,
  role: CoachRequest["targetRole"]
): CoachRecommendation | null {
  const candidates = questions
    .map((question) => {
      const fresh = completed.has(question.id) ? 0 : 38;
      const fit = Math.max(0, 20 - Math.abs(question.estimatedMinutes - availableMinutes));
      const roleTags = role === "platform" ? ["kafka", "redis", "reliability", "distributed-systems"] : ["api", "database", "cache", "kafka", "redis"];
      const roleBonus = role === "general" || question.tags.some((tag) => roleTags.includes(tag)) ? 10 : 0;
      return { question, score: fresh + fit + roleBonus };
    })
    .sort((left, right) => right.score - left.score || left.question.estimatedMinutes - right.question.estimatedMinutes);
  const chosen = candidates[0];
  if (!chosen) return null;

  return {
    question: chosen.question,
    score: chosen.score,
    reason: completed.has(chosen.question.id)
      ? `It is a compact way to revisit ${topicName(chosen.question.primaryTopicId)} in your ${availableMinutes}-minute window.`
      : `It is fresh practice in ${topicName(chosen.question.primaryTopicId)} and fits your ${availableMinutes}-minute window.`,
    nextTopicId: chosen.question.prerequisites[0]
  };
}

function streakFromAttempts(attempts: ReturnType<typeof useLearner>["attempts"]): number {
  const days = new Set(
    attempts
      .filter((attempt) => attempt.status === "completed" && attempt.completedAt)
      .map((attempt) => attempt.completedAt?.slice(0, 10))
      .filter((day): day is string => Boolean(day))
  );
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function CoachCard() {
  const { attempts, syncStatus } = useLearner();
  const [availableMinutes, setAvailableMinutes] = useState(30);
  const [targetRole, setTargetRole] = useState<CoachRequest["targetRole"]>("backend");
  const [remoteRecommendation, setRemoteRecommendation] = useState<CoachRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingLocalPlan, setUsingLocalPlan] = useState(false);
  const completed = useMemo(() => completedQuestionIds(attempts), [attempts]);
  const fallback = useMemo(
    () => chooseLocalRecommendation(catalogQuestions, completed, availableMinutes, targetRole),
    [completed, availableMinutes, targetRole]
  );

  useEffect(() => {
    let current = true;
    if (syncStatus !== "online") {
      setRemoteRecommendation(null);
      setUsingLocalPlan(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    void api
      .getCoach({ availableMinutes, targetRole })
      .then((response) => {
        if (!current) return;
        setRemoteRecommendation(response.recommendation);
        setUsingLocalPlan(!response.recommendation);
      })
      .catch(() => {
        if (!current) return;
        setRemoteRecommendation(null);
        setUsingLocalPlan(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [availableMinutes, targetRole, syncStatus]);

  const recommendation = remoteRecommendation ?? fallback;
  if (!recommendation) return null;
  const question = recommendation.question;
  const activeAttempt = newestInProgressAttempt(attempts, question.id);

  return (
    <section className="coach-card" aria-labelledby="coach-heading">
      <div className="coach-card__flare" aria-hidden="true" />
      <div className="coach-card__header">
        <span className="coach-card__icon"><Icon name="sparkle" size={19} /></span>
        <div>
          <p className="eyebrow">Your study coach</p>
          <h2 id="coach-heading">Make this session count</h2>
        </div>
        {loading ? <span className="coach-card__loading">Refreshing</span> : null}
      </div>
      <p className="coach-card__intro">Set your window, then get one useful prompt—not an overwhelming to-do list.</p>
      <div className="coach-options" aria-label="Study coach preferences">
        <div className="segmented-control" aria-label="Available time">
          {[20, 30, 45].map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={availableMinutes === minutes ? "is-selected" : ""}
              aria-pressed={availableMinutes === minutes}
              onClick={() => setAvailableMinutes(minutes)}
            >
              {minutes}m
            </button>
          ))}
        </div>
        <label className="select-wrap">
          <span className="sr-only">Target role</span>
          <select value={targetRole} onChange={(event) => setTargetRole(event.target.value as CoachRequest["targetRole"])}>
            <option value="backend">Backend role</option>
            <option value="platform">Platform role</option>
            <option value="general">General prep</option>
          </select>
          <Icon name="chevron-down" size={15} />
        </label>
      </div>
      <article className="coach-recommendation">
        <div className="coach-recommendation__meta">
          <DifficultyBadge difficulty={question.difficulty} />
          <span><Icon name="clock" size={14} />{formatMinutes(question.estimatedMinutes)}</span>
          {usingLocalPlan ? <em>Local plan</em> : <em>Personalized</em>}
        </div>
        <h3>{question.title}</h3>
        <p>{recommendation.reason}</p>
        <div className="coach-recommendation__actions">
          <Link className="button button--light" to={practicePath(question.slug, activeAttempt?.mode ?? "learn")} aria-label={`${activeAttempt ? `Resume ${practiceModeLabel(activeAttempt.mode)} session for` : "Start a Learn session for"} ${question.title}`}>
            {activeAttempt ? `Resume ${practiceModeLabel(activeAttempt.mode)} session` : "Start Learn session"} <Icon name="arrow-right" size={16} />
          </Link>
          {!activeAttempt ? <Link className="text-link" to={practicePath(question.slug, "mock")} aria-label={`Start a Mock session for ${question.title}`}>Try a Mock session <Icon name="arrow-right" size={14} /></Link> : null}
        </div>
      </article>
    </section>
  );
}

function ReviewCard(): React.JSX.Element {
  const { attempts, mastery, syncStatus } = useLearner();
  const [remoteQueue, setRemoteQueue] = useState<ReviewQueueItem[] | undefined>(undefined);
  const activeAttempt = useMemo(() => newestInProgressAttempt(attempts), [attempts]);
  const activeQuestion = activeAttempt
    ? catalogQuestions.find((question) => question.id === activeAttempt.questionId)
    : undefined;
  const fallbackQuestion = useMemo(() => localReviewQuestion(mastery, attempts), [mastery, attempts]);

  useEffect(() => {
    let current = true;
    if (syncStatus !== "online") {
      setRemoteQueue(undefined);
      return;
    }

    void api.getReviewQueue()
      .then((response) => {
        if (current) setRemoteQueue(response.items);
      })
      .catch(() => {
        if (current) setRemoteQueue(undefined);
      });

    return () => {
      current = false;
    };
  }, [syncStatus]);

  const reviewQuestion = remoteQueue === undefined
    ? fallbackQuestion
    : remoteQueue.map(questionForReviewItem).find((question): question is InterviewQuestion => Boolean(question));

  if (activeAttempt && activeQuestion) {
    const label = practiceModeLabel(activeAttempt.mode);
    return <section className="review-card review-card--resume" aria-labelledby="resume-studio-title">
      <span className="review-card__icon"><Icon name="play" size={18} /></span>
      <div><p className="eyebrow">Your active studio</p><strong id="resume-studio-title">{activeQuestion.title}</strong><p>Your private {label} workspace is ready to continue.</p></div>
      <Link className="button button--secondary button--small" to={practicePath(activeQuestion.slug, activeAttempt.mode)} aria-label={`Resume ${label} session for ${activeQuestion.title}`}>Resume {label}<Icon name="arrow-right" size={14} /></Link>
    </section>;
  }

  if (reviewQuestion) {
    return <section className="review-card review-card--due" aria-labelledby="review-title">
      <span className="review-card__icon"><Icon name="refresh" size={18} /></span>
      <div><p className="eyebrow">Spaced repetition</p><strong id="review-title">Review {reviewQuestion.title}</strong><p>A short Learn session is due now—restate the tradeoff before checking the framework.</p></div>
      <Link className="button button--secondary button--small" to={practicePath(reviewQuestion.slug, "learn")} aria-label={`Start a Learn review for ${reviewQuestion.title}`}>Review now<Icon name="arrow-right" size={14} /></Link>
    </section>;
  }

  return <section className="review-card" aria-label="Review queue">
    <span className="review-card__icon"><Icon name="calendar" size={18} /></span>
    <div><strong>Your review queue is clear</strong><p>Complete a practice review to begin spaced repetition.</p></div>
  </section>;
}

export function DashboardPage() {
  const { attempts, bookmarks } = useLearner();
  const completed = useMemo(() => completedQuestionIds(attempts), [attempts]);
  const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
  const averageScore = completedAttempts.length
    ? (completedAttempts.reduce((sum, attempt) => sum + (attempt.selfScore ?? 0), 0) / completedAttempts.length).toFixed(1)
    : "—";
  const recentQuestions = completedAttempts
    .slice()
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))
    .map((attempt) => catalogQuestions.find((question) => question.id === attempt.questionId))
    .filter((question): question is InterviewQuestion => Boolean(question))
    .slice(0, 3);
  const currentStreak = streakFromAttempts(attempts);

  return (
    <div className="dashboard page-enter">
      <PageHeading
        eyebrow="Your interview practice workspace"
        title="Build the judgment behind great backend systems."
        description="Work through structured prompts, make tradeoffs explicit, and track the repetitions that matter."
        action={<Link className="button button--primary" to="/questions"><Icon name="play" size={16} />Browse prompts</Link>}
      />

      <section className="dashboard-hero-grid">
        <CoachCard />
        <div className="dashboard-hero__side">
          <section className="focus-card">
            <span className="focus-card__pattern" aria-hidden="true" />
            <div className="focus-card__top"><p className="eyebrow">The curriculum</p><Icon name="layers" size={20} /></div>
            <strong>{catalogModules.length} learning modules</strong>
            <p>From foundations through cache, streams, reliability, and final case studies.</p>
            <Link to="/curriculum" className="text-link">Explore the map <Icon name="arrow-right" size={14} /></Link>
          </section>
          <ReviewCard />
        </div>
      </section>

      <section className="stats-grid" aria-label="Your practice statistics">
        <StatCard icon="check" value={completed.size} label="Questions practiced" detail={`of ${catalogQuestions.length} in the bank`} tone="mint" />
        <StatCard icon="bookmark" value={bookmarks.length} label="Saved for later" detail="A private shortlist" tone="cream" />
        <StatCard icon="target" value={averageScore === "—" ? "—" : `${averageScore}/4`} label="Average self-score" detail="Across completed reviews" tone="dark" />
        <StatCard icon="flame" value={currentStreak} label="Day streak" detail={currentStreak ? "Keep the rhythm" : "Your next session starts it"} tone="coral" />
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><p className="eyebrow">A clear path, not a pile of links</p><h2>Curriculum at a glance</h2></div>
          <Link to="/curriculum" className="text-link">View all modules <Icon name="arrow-right" size={14} /></Link>
        </div>
        <div className="module-overview-grid">
          {catalogModules.slice(0, 6).map((module, index) => {
            const questions = getModuleQuestions(module.id);
            const moduleCompleted = questions.filter((question) => completed.has(question.id)).length;
            const percentage = questions.length ? (moduleCompleted / questions.length) * 100 : 0;
            return (
              <Link className="module-overview-card" to={`/curriculum#${module.slug}`} key={module.id} style={{ "--module-accent": module.accent } as React.CSSProperties}>
                <span className="module-overview-card__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="module-overview-card__arrow"><Icon name="arrow-up-right" size={17} /></span>
                <h3>{module.title}</h3>
                <p>{getModuleTopics(module.id).length} topics · {questions.length} prompts</p>
                <ProgressBar value={percentage} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <section className="recent-card">
          <div className="section-heading section-heading--small"><div><p className="eyebrow">Practice history</p><h2>Recent reflections</h2></div><Link to="/progress" className="text-link">See progress <Icon name="arrow-right" size={14} /></Link></div>
          {recentQuestions.length ? (
            <ul className="recent-list">
              {recentQuestions.map((question) => {
                const record = completedAttempts.find((attempt) => attempt.questionId === question.id);
                return <li key={question.id}><span className="recent-list__check"><Icon name="check" size={14} /></span><div><Link to={`/questions/${question.slug}`}>{question.title}</Link><small>{topicName(question.primaryTopicId)} · self-score {record?.selfScore ?? "—"}/4</small></div><Icon name="chevron-right" size={17} /></li>;
              })}
            </ul>
          ) : (
            <EmptyState icon="compass" title="Your first prompt is waiting" description="Choose a focused question, think out loud, then assess your own reasoning." actionTo="/questions" actionLabel="Open question bank" />
          )}
        </section>
        <section className="tip-card">
          <span className="tip-card__icon"><Icon name="lightbulb" size={19} /></span>
          <p className="eyebrow">Architect’s note</p>
          <h2>Name the tradeoff.</h2>
          <p>Strong system-design answers make assumptions visible, then explain what changes under a different constraint.</p>
          <Link to="/questions?type=design" className="text-link">Practice a design prompt <Icon name="arrow-right" size={14} /></Link>
        </section>
      </section>
    </div>
  );
}
