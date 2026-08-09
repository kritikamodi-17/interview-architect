export {
  curriculum,
  modules,
  questions,
  topics
} from "./data.js";

export {
  assertValidCurriculum,
  CATALOG_SCHEMA_VERSION,
  curriculumSchema,
  moduleSchema,
  questionSchema,
  referenceSchema,
  topicSchema,
  validateCurriculum,
  type CurriculumCatalog,
  type CurriculumValidationIssue
} from "./schema.js";

export {
  filterQuestions,
  getCurriculumStats,
  getModuleById,
  getModuleBySlug,
  getPublishedQuestions,
  getQuestionById,
  getQuestionBySlug,
  getQuestionsForModule,
  getQuestionsForTopic,
  getTopicById,
  getTopicBySlug,
  getTopicsForModule,
  searchQuestions,
  type CurriculumStats,
  type QuestionFilters
} from "./selectors.js";
