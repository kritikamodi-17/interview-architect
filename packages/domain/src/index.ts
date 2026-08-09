export type Difficulty = "foundation" | "intermediate" | "senior";

export type QuestionFormat =
  | "concept"
  | "compare"
  | "calculation"
  | "design"
  | "debug";

export type QuestionStatus = "draft" | "published";

export interface CurriculumModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  accent: string;
  order: number;
  topicIds: string[];
}

export interface Topic {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string;
  learningObjectives: string[];
  prerequisiteTopicIds: string[];
  order: number;
}

export interface AnswerSection {
  heading: string;
  markdown: string;
}

export interface RubricDimension {
  dimension: string;
  weight: number;
  mustMention: string[];
  scoreGuide: Record<0 | 1 | 2 | 3 | 4, string>;
}

export interface InterviewQuestion {
  id: string;
  slug: string;
  version: number;
  status: QuestionStatus;
  moduleId: string;
  primaryTopicId: string;
  title: string;
  type: QuestionFormat;
  difficulty: Difficulty;
  estimatedMinutes: number;
  tags: string[];
  prerequisites: string[];
  prompt: {
    question: string;
    scenario?: string;
    requirements?: string[];
    constraints?: string[];
    followUps: string[];
  };
  hints: string[];
  answer: {
    summary: string;
    sections: AnswerSection[];
    tradeoffs: string[];
    failureModes: string[];
    keyTerms: string[];
  };
  rubric: RubricDimension[];
  commonPitfalls: string[];
  references: Array<{ label: string; href: string }>;
  reviewedAt: string;
}

export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export interface PracticeAttempt {
  id: string;
  userId: string;
  questionId: string;
  questionVersion: number;
  status: AttemptStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  selfScore?: number;
  rubricScores?: Record<string, number>;
}

export interface TopicMastery {
  userId: string;
  topicId: string;
  masteryScore: number;
  confidence: number;
  attemptsCount: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
}

export interface LearnerProgress {
  userId: string;
  attempts: PracticeAttempt[];
  bookmarks: string[];
  mastery: TopicMastery[];
}

export interface CoachRequest {
  availableMinutes: number;
  targetRole: "backend" | "platform" | "general";
  preferredTopicId?: string;
}

export interface CoachRecommendation {
  question: InterviewQuestion;
  score: number;
  reason: string;
  nextTopicId?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function difficultyLabel(difficulty: Difficulty): string {
  return {
    foundation: "Foundation",
    intermediate: "Intermediate",
    senior: "Senior"
  }[difficulty];
}

export function calculateMastery(attempts: PracticeAttempt[]): number {
  const completed = attempts.filter(
    (attempt) => attempt.status === "completed" && typeof attempt.selfScore === "number"
  );

  if (completed.length === 0) return 0;

  const weightedScore = completed.reduce((total, attempt, index) => {
    const recencyWeight = 1 + index / completed.length;
    return total + (attempt.selfScore ?? 0) * recencyWeight;
  }, 0);
  const weights = completed.reduce(
    (total, _attempt, index) => total + 1 + index / completed.length,
    0
  );

  return Math.round(Math.min(100, (weightedScore / weights) * 25));
}

export function nextReviewAt(selfScore: number, from = new Date()): string {
  const clamped = Math.max(0, Math.min(4, selfScore));
  const intervals = [1, 2, 4, 8, 14];
  const intervalDays = intervals[clamped] ?? 1;
  return new Date(from.getTime() + intervalDays * MS_PER_DAY).toISOString();
}

function isReviewDue(mastery: TopicMastery | undefined, now: Date): boolean {
  return Boolean(mastery?.nextReviewAt && new Date(mastery.nextReviewAt) <= now);
}

function targetRoleWeight(question: InterviewQuestion, targetRole: CoachRequest["targetRole"]): number {
  if (targetRole === "general") return 0;
  if (targetRole === "platform") {
    return question.tags.some((tag) => ["kafka", "redis", "reliability", "distributed-systems"].includes(tag))
      ? 8
      : 0;
  }
  return question.tags.some((tag) => ["api", "database", "cache", "kafka", "redis"].includes(tag))
    ? 6
    : 0;
}

export function recommendNextQuestion(
  questions: InterviewQuestion[],
  progress: LearnerProgress,
  request: CoachRequest,
  now = new Date()
): CoachRecommendation | undefined {
  const completedQuestionIds = new Set(
    progress.attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.questionId)
  );
  const masteryByTopic = new Map(progress.mastery.map((item) => [item.topicId, item]));

  const candidates = questions
    .filter((question) => question.status === "published")
    .filter((question) => question.estimatedMinutes <= request.availableMinutes + 5)
    .filter((question) => !request.preferredTopicId || question.primaryTopicId === request.preferredTopicId)
    .map((question) => {
      const mastery = masteryByTopic.get(question.primaryTopicId);
      const uncompletedBonus = completedQuestionIds.has(question.id) ? 0 : 25;
      const weakTopicBonus = Math.round((100 - (mastery?.masteryScore ?? 0)) * 0.35);
      const reviewBonus = isReviewDue(mastery, now) ? 22 : 0;
      const timeFit = Math.max(0, 12 - Math.abs(request.availableMinutes - question.estimatedMinutes));
      const preferredTopicBonus = request.preferredTopicId === question.primaryTopicId ? 12 : 0;
      const score =
        uncompletedBonus +
        weakTopicBonus +
        reviewBonus +
        timeFit +
        preferredTopicBonus +
        targetRoleWeight(question, request.targetRole);

      return { question, score, mastery, reviewDue: isReviewDue(mastery, now) };
    })
    .sort((a, b) => b.score - a.score || a.question.estimatedMinutes - b.question.estimatedMinutes);

  const chosen = candidates[0];
  if (!chosen) return undefined;

  const reasons = [
    chosen.reviewDue ? "this topic is due for review" : undefined,
    !completedQuestionIds.has(chosen.question.id) ? "it gives you fresh practice" : undefined,
    chosen.mastery && chosen.mastery.masteryScore < 60 ? "it targets a lower-mastery topic" : undefined,
    `it fits your ${request.availableMinutes}-minute study window`
  ].filter((reason): reason is string => Boolean(reason));

  return {
    question: chosen.question,
    score: chosen.score,
    reason: `Recommended because ${reasons.join(" and ")}.`,
    nextTopicId: chosen.question.prerequisites[0]
  };
}

export function percentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
