import type {
  CurriculumModule,
  Difficulty,
  InterviewQuestion,
  QuestionFormat,
  QuestionStatus,
  Topic
} from "@interview-architect/domain";

import { modules, questions, topics } from "./data.js";

export type QuestionFilters = {
  moduleId?: string;
  moduleSlug?: string;
  topicId?: string;
  topicSlug?: string;
  difficulty?: Difficulty | readonly Difficulty[];
  type?: QuestionFormat | readonly QuestionFormat[];
  status?: QuestionStatus | readonly QuestionStatus[];
  tags?: string | readonly string[];
  query?: string;
  minEstimatedMinutes?: number;
  maxEstimatedMinutes?: number;
};

export type CurriculumStats = {
  moduleCount: number;
  topicCount: number;
  questionCount: number;
  publishedQuestionCount: number;
  questionCountByModule: Record<string, number>;
  questionCountByDifficulty: Record<Difficulty, number>;
};

function lower(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function asSet<T extends string>(value: T | readonly T[] | undefined): Set<T> | undefined {
  if (value === undefined) return undefined;
  return new Set(Array.isArray(value) ? value : [value]);
}

function topicForQuestion(question: InterviewQuestion): Topic | undefined {
  return topics.find((topic) => topic.id === question.primaryTopicId);
}

/**
 * Filters in memory without mutating its source. Multiple tag filters use AND
 * semantics: a result must have all requested tags. Other multi-value filters
 * use OR semantics, matching a typical catalog filter UI.
 */
export function filterQuestions(
  source: readonly InterviewQuestion[] = questions,
  filters: QuestionFilters = {}
): InterviewQuestion[] {
  const difficulty = asSet(filters.difficulty);
  const type = asSet(filters.type);
  const status = asSet(filters.status);
  const tags = asSet(filters.tags)?.values();
  const requiredTags = tags ? [...tags].map(lower) : [];
  const query = filters.query ? lower(filters.query) : "";
  const moduleId = filters.moduleId ? lower(filters.moduleId) : undefined;
  const moduleSlug = filters.moduleSlug ? lower(filters.moduleSlug) : undefined;
  const topicId = filters.topicId ? lower(filters.topicId) : undefined;
  const topicSlug = filters.topicSlug ? lower(filters.topicSlug) : undefined;

  const selectedModule = moduleSlug
    ? modules.find((module) => module.slug === moduleSlug)
    : undefined;
  const selectedTopic = topicSlug ? topics.find((topic) => topic.slug === topicSlug) : undefined;

  return source.filter((question) => {
    if (moduleId && question.moduleId !== moduleId) return false;
    if (selectedModule && question.moduleId !== selectedModule.id) return false;
    if (topicId && question.primaryTopicId !== topicId) return false;
    if (selectedTopic && question.primaryTopicId !== selectedTopic.id) return false;
    if (difficulty && !difficulty.has(question.difficulty)) return false;
    if (type && !type.has(question.type)) return false;
    if (status && !status.has(question.status)) return false;
    if (
      filters.minEstimatedMinutes !== undefined &&
      question.estimatedMinutes < filters.minEstimatedMinutes
    ) {
      return false;
    }
    if (
      filters.maxEstimatedMinutes !== undefined &&
      question.estimatedMinutes > filters.maxEstimatedMinutes
    ) {
      return false;
    }
    if (requiredTags.length > 0) {
      const normalizedTags = new Set(question.tags.map(lower));
      if (!requiredTags.every((tag) => normalizedTags.has(tag))) return false;
    }
    if (!query) return true;

    return searchableText(question).includes(query);
  });
}

function searchableText(question: InterviewQuestion): string {
  const topic = topicForQuestion(question);
  return lower(
    [
      question.title,
      question.slug,
      question.tags.join(" "),
      question.primaryTopicId,
      topic?.title ?? "",
      question.prompt.question,
      question.prompt.scenario ?? "",
      question.answer.summary,
      question.answer.keyTerms.join(" ")
    ].join(" ")
  );
}

/**
 * Full-text search with a small deterministic relevance boost for title, tag,
 * and exact-phrase matches. It deliberately stays client-side and dependency
 * free so the static curriculum can be used by the SPA and Worker alike.
 */
export function searchQuestions(
  query: string,
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion[] {
  const normalized = lower(query);
  if (!normalized) return [...source];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return source
    .map((question) => {
      const title = lower(question.title);
      const tags = lower(question.tags.join(" "));
      const prompt = lower(question.prompt.question);
      const answer = lower(`${question.answer.summary} ${question.answer.keyTerms.join(" ")}`);
      let score = title.includes(normalized) ? 30 : 0;

      for (const token of tokens) {
        if (title.includes(token)) score += 8;
        if (tags.includes(token)) score += 6;
        if (prompt.includes(token)) score += 3;
        if (answer.includes(token)) score += 2;
      }

      return { question, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.question.estimatedMinutes - right.question.estimatedMinutes ||
        left.question.title.localeCompare(right.question.title)
    )
    .map(({ question }) => question);
}

export function getModuleById(id: string): CurriculumModule | undefined {
  return modules.find((module) => module.id === lower(id));
}

export function getModuleBySlug(slug: string): CurriculumModule | undefined {
  return modules.find((module) => module.slug === lower(slug));
}

export function getTopicById(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === lower(id));
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return topics.find((topic) => topic.slug === lower(slug));
}

export function getQuestionById(
  id: string,
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion | undefined {
  return source.find((question) => question.id === lower(id));
}

export function getQuestionBySlug(
  slug: string,
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion | undefined {
  return source.find((question) => question.slug === lower(slug));
}

export function getTopicsForModule(moduleId: string): Topic[] {
  return topics
    .filter((topic) => topic.moduleId === lower(moduleId))
    .slice()
    .sort((left, right) => left.order - right.order);
}

export function getQuestionsForModule(
  moduleId: string,
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion[] {
  return source
    .filter((question) => question.moduleId === lower(moduleId))
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getQuestionsForTopic(
  topicId: string,
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion[] {
  return source
    .filter((question) => question.primaryTopicId === lower(topicId))
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getPublishedQuestions(
  source: readonly InterviewQuestion[] = questions
): InterviewQuestion[] {
  return source.filter((question) => question.status === "published");
}

export function getCurriculumStats(
  source: readonly InterviewQuestion[] = questions
): CurriculumStats {
  const published = source.filter((question) => question.status === "published");
  const questionCountByModule = Object.fromEntries(
    modules.map((module) => [
      module.id,
      source.filter((question) => question.moduleId === module.id).length
    ])
  );
  const questionCountByDifficulty: Record<Difficulty, number> = {
    foundation: 0,
    intermediate: 0,
    senior: 0
  };
  for (const question of source) {
    questionCountByDifficulty[question.difficulty] += 1;
  }

  return {
    moduleCount: modules.length,
    topicCount: topics.length,
    questionCount: source.length,
    publishedQuestionCount: published.length,
    questionCountByModule,
    questionCountByDifficulty
  };
}
