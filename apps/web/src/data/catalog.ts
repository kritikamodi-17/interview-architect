import { modules, questions, topics } from "@interview-architect/content";
import type { CurriculumModule, InterviewQuestion, Topic } from "@interview-architect/domain";

/**
 * The catalog deliberately lives in the static bundle. Progress is the only
 * learner-specific data that needs the API, so the core study experience keeps
 * working when the Worker is not running locally.
 */
export const catalogModules = modules as CurriculumModule[];
export const catalogTopics = topics as Topic[];
export const catalogQuestions = (questions as InterviewQuestion[]).filter(
  (question) => question.status === "published"
);

export const moduleById = new Map(catalogModules.map((module) => [module.id, module]));
export const topicById = new Map(catalogTopics.map((topic) => [topic.id, topic]));
export const questionBySlug = new Map(catalogQuestions.map((question) => [question.slug, question]));

export function getModuleTopics(moduleId: string): Topic[] {
  return catalogTopics
    .filter((topic) => topic.moduleId === moduleId)
    .sort((left, right) => left.order - right.order);
}

export function getTopicQuestions(topicId: string): InterviewQuestion[] {
  return catalogQuestions.filter((question) => question.primaryTopicId === topicId);
}

export function getModuleQuestions(moduleId: string): InterviewQuestion[] {
  return catalogQuestions.filter((question) => question.moduleId === moduleId);
}

export function getQuestionLabel(question: InterviewQuestion): string {
  return question.title.replace(/^\s*\d+[.:\-]\s*/, "");
}

export function topicName(topicId: string): string {
  return topicById.get(topicId)?.title ?? "Backend systems";
}

export function moduleName(moduleId: string): string {
  return moduleById.get(moduleId)?.title ?? "System design";
}

export function getSearchableText(question: InterviewQuestion): string {
  return [
    question.title,
    question.type,
    question.difficulty,
    question.tags.join(" "),
    question.prompt.question,
    question.prompt.scenario ?? "",
    topicName(question.primaryTopicId),
    moduleName(question.moduleId)
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function searchCatalog(query: string): InterviewQuestion[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return catalogQuestions;

  return catalogQuestions.filter((question) => getSearchableText(question).includes(normalized));
}
