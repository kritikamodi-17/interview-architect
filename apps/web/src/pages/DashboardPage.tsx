import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CoachRecommendation, CoachRequest, InterviewQuestion } from "@interview-architect/domain";
import { api } from "../lib/api";
import {
  catalogModules,
  catalogQuestions,
  getModuleQuestions,
  getModuleTopics,
  moduleById,
  questionBySlug,
  topicName
} from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
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
        <Link className="button button--light" to={`/questions/${question.slug}`}>
          Start this prompt <Icon name="arrow-right" size={16} />
        </Link>
      </article>
    </section>
  );
}

export function DashboardPage() {
  const { attempts, bookmarks, mastery } = useLearner();
  const completed = useMemo(() => completedQuestionIds(attempts), [attempts]);
  const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
  const averageScore = completedAttempts.length
    ? (completedAttempts.reduce((sum, attempt) => sum + (attempt.selfScore ?? 0), 0) / completedAttempts.length).toFixed(1)
    : "—";
  const reviewDue = mastery.filter(
    (item) => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()
  ).length;
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
          <section className="review-card">
            <span className="review-card__icon"><Icon name="calendar" size={18} /></span>
            <div><strong>{reviewDue ? `${reviewDue} review ${reviewDue === 1 ? "is" : "are"} due` : "Your review queue is clear"}</strong><p>{reviewDue ? "A quick revisit locks in the hard-earned insight." : "Complete a practice review to begin spaced repetition."}</p></div>
          </section>
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
