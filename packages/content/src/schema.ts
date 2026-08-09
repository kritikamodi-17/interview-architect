import { z } from "zod";

import type {
  CurriculumModule,
  InterviewQuestion,
  Topic
} from "@interview-architect/domain";

/**
 * The catalog has a separate schema version so consumers can distinguish a
 * content breaking change from an ordinary editorial question revision.
 */
export const CATALOG_SCHEMA_VERSION = "1.0";

const idSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "Use a lowercase kebab-case id.");

const questionIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/, "Use topic-id:question-slug.");

const markdownSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), {
    message: "Raw HTML is not allowed in curriculum markdown."
  });

const urlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "References must use HTTPS."
  });

export const moduleSchema = z
  .object({
    id: idSchema,
    slug: idSchema,
    title: z.string().trim().min(3).max(90),
    description: markdownSchema.max(500),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color."),
    order: z.number().int().positive(),
    topicIds: z.array(idSchema).min(1)
  })
  .strict();

export const topicSchema = z
  .object({
    id: idSchema,
    moduleId: idSchema,
    slug: idSchema,
    title: z.string().trim().min(3).max(90),
    description: markdownSchema.max(500),
    learningObjectives: z.array(markdownSchema.max(240)).min(2).max(8),
    prerequisiteTopicIds: z.array(idSchema),
    order: z.number().int().positive()
  })
  .strict();

export const answerSectionSchema = z
  .object({
    heading: z.string().trim().min(3).max(120),
    markdown: markdownSchema.max(8_000)
  })
  .strict();

const scoreGuideSchema = z
  .object({
    0: markdownSchema.max(500),
    1: markdownSchema.max(500),
    2: markdownSchema.max(500),
    3: markdownSchema.max(500),
    4: markdownSchema.max(500)
  })
  .strict();

export const rubricDimensionSchema = z
  .object({
    dimension: z.string().trim().min(3).max(100),
    weight: z.number().int().min(1).max(100),
    mustMention: z.array(markdownSchema.max(180)).min(1).max(8),
    scoreGuide: scoreGuideSchema
  })
  .strict();

export const referenceSchema = z
  .object({
    label: z.string().trim().min(3).max(160),
    href: urlSchema
  })
  .strict();

export const questionSchema = z
  .object({
    id: questionIdSchema,
    slug: idSchema,
    version: z.number().int().positive(),
    status: z.enum(["draft", "published"]),
    moduleId: idSchema,
    primaryTopicId: idSchema,
    title: z.string().trim().min(8).max(180),
    type: z.enum(["concept", "compare", "calculation", "design", "debug"]),
    difficulty: z.enum(["foundation", "intermediate", "senior"]),
    estimatedMinutes: z.number().int().min(5).max(90),
    tags: z.array(idSchema).min(2).max(12),
    prerequisites: z.array(idSchema),
    prompt: z
      .object({
        question: markdownSchema.max(3_500),
        scenario: markdownSchema.max(3_500).optional(),
        requirements: z.array(markdownSchema.max(500)).min(1).max(10).optional(),
        constraints: z.array(markdownSchema.max(500)).min(1).max(10).optional(),
        followUps: z.array(markdownSchema.max(1_000)).min(2).max(8)
      })
      .strict(),
    hints: z.array(markdownSchema.max(800)).min(2).max(6),
    answer: z
      .object({
        summary: markdownSchema.max(2_000),
        sections: z.array(answerSectionSchema).min(2).max(8),
        tradeoffs: z.array(markdownSchema.max(800)).min(1).max(8),
        failureModes: z.array(markdownSchema.max(800)).min(1).max(8),
        keyTerms: z.array(markdownSchema.max(120)).min(3).max(16)
      })
      .strict(),
    rubric: z.array(rubricDimensionSchema).min(3).max(5),
    commonPitfalls: z.array(markdownSchema.max(800)).min(2).max(8),
    references: z.array(referenceSchema).min(1).max(5),
    reviewedAt: z.string().datetime({ offset: true })
  })
  .strict()
  .superRefine((question, context) => {
    const expectedId = `${question.primaryTopicId}:${question.slug}`;
    if (question.id !== expectedId) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: `Question id must be ${expectedId}.`
      });
    }

    const rubricWeight = question.rubric.reduce((total, dimension) => total + dimension.weight, 0);
    if (rubricWeight !== 100) {
      context.addIssue({
        code: "custom",
        path: ["rubric"],
        message: `Rubric weights must total 100; received ${rubricWeight}.`
      });
    }

    if (new Set(question.tags).size !== question.tags.length) {
      context.addIssue({
        code: "custom",
        path: ["tags"],
        message: "Question tags must be unique."
      });
    }
  });

export const curriculumSchema = z
  .object({
    schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
    version: z.string().regex(/^\d{4}\.\d{2}\.\d+$/, "Use YYYY.MM.revision."),
    modules: z.array(moduleSchema).min(8),
    topics: z.array(topicSchema).min(8),
    questions: z.array(questionSchema).min(1)
  })
  .strict();

export interface CurriculumCatalog {
  schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  version: string;
  modules: CurriculumModule[];
  topics: Topic[];
  questions: InterviewQuestion[];
}

export type CurriculumValidationIssue = {
  path: string;
  message: string;
};

const SAFE_REFERENCE_HOSTS = new Set([
  "redis.io",
  "kafka.apache.org",
  "www.rfc-editor.org",
  "www.postgresql.org",
  "sre.google",
  "owasp.org",
  "cheatsheetseries.owasp.org",
  "martin.kleppmann.com",
  "aws.amazon.com"
]);

function issue(path: string, message: string): CurriculumValidationIssue {
  return { path, message };
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/**
 * Performs structural Zod validation plus cross-record integrity checks. It is
 * deliberately non-throwing so the CLI and CI can report every catalog error
 * in a single pass.
 */
export function validateCurriculum(value: unknown): CurriculumValidationIssue[] {
  const parsed = curriculumSchema.safeParse(value);
  if (!parsed.success) {
    return parsed.error.issues.map((validationIssue) =>
      issue(validationIssue.path.join(".") || "catalog", validationIssue.message)
    );
  }

  const catalog = parsed.data;
  const issues: CurriculumValidationIssue[] = [];
  const moduleIds = new Set(catalog.modules.map((module) => module.id));
  const topicById = new Map(catalog.topics.map((topic) => [topic.id, topic]));

  for (const duplicate of duplicateValues(catalog.modules.map((module) => module.id))) {
    issues.push(issue("modules", `Duplicate module id: ${duplicate}.`));
  }
  for (const duplicate of duplicateValues(catalog.modules.map((module) => module.slug))) {
    issues.push(issue("modules", `Duplicate module slug: ${duplicate}.`));
  }
  for (const duplicate of duplicateValues(catalog.modules.map((module) => String(module.order)))) {
    issues.push(issue("modules", `Duplicate module order: ${duplicate}.`));
  }
  for (const duplicate of duplicateValues(catalog.topics.map((topic) => topic.id))) {
    issues.push(issue("topics", `Duplicate topic id: ${duplicate}.`));
  }
  for (const duplicate of duplicateValues(catalog.questions.map((question) => question.id))) {
    issues.push(issue("questions", `Duplicate question id: ${duplicate}.`));
  }
  for (const duplicate of duplicateValues(catalog.questions.map((question) => question.slug))) {
    issues.push(issue("questions", `Duplicate question slug: ${duplicate}.`));
  }

  for (const [index, module] of catalog.modules.entries()) {
    for (const duplicate of duplicateValues(module.topicIds)) {
      issues.push(issue(`modules.${index}.topicIds`, `Duplicate topic id: ${duplicate}.`));
    }
    for (const topicId of module.topicIds) {
      const topic = topicById.get(topicId);
      if (!topic) {
        issues.push(issue(`modules.${index}.topicIds`, `Unknown topic id: ${topicId}.`));
      } else if (topic.moduleId !== module.id) {
        issues.push(
          issue(
            `modules.${index}.topicIds`,
            `Topic ${topicId} belongs to ${topic.moduleId}, not ${module.id}.`
          )
        );
      }
    }
  }

  for (const [index, topic] of catalog.topics.entries()) {
    if (!moduleIds.has(topic.moduleId)) {
      issues.push(issue(`topics.${index}.moduleId`, `Unknown module id: ${topic.moduleId}.`));
    }
    for (const prerequisite of topic.prerequisiteTopicIds) {
      if (prerequisite === topic.id) {
        issues.push(issue(`topics.${index}.prerequisiteTopicIds`, "A topic cannot require itself."));
      } else if (!topicById.has(prerequisite)) {
        issues.push(
          issue(`topics.${index}.prerequisiteTopicIds`, `Unknown prerequisite topic: ${prerequisite}.`)
        );
      }
    }
  }

  for (const [index, question] of catalog.questions.entries()) {
    const topic = topicById.get(question.primaryTopicId);
    if (!topic) {
      issues.push(
        issue(`questions.${index}.primaryTopicId`, `Unknown topic id: ${question.primaryTopicId}.`)
      );
    } else if (question.moduleId !== topic.moduleId) {
      issues.push(
        issue(
          `questions.${index}.moduleId`,
          `Question module ${question.moduleId} does not match topic module ${topic.moduleId}.`
        )
      );
    }
    for (const prerequisite of question.prerequisites) {
      if (!topicById.has(prerequisite)) {
        issues.push(
          issue(`questions.${index}.prerequisites`, `Unknown prerequisite topic: ${prerequisite}.`)
        );
      }
    }
    for (const [referenceIndex, reference] of question.references.entries()) {
      const hostname = new URL(reference.href).hostname.toLowerCase();
      if (!SAFE_REFERENCE_HOSTS.has(hostname)) {
        issues.push(
          issue(
            `questions.${index}.references.${referenceIndex}.href`,
            `Reference host ${hostname} is not on the approved source list.`
          )
        );
      }
    }
  }

  const published = catalog.questions.filter((question) => question.status === "published");
  if (published.length < 60) {
    issues.push(issue("questions", `At least 60 published questions are required; found ${published.length}.`));
  }
  for (const [moduleId, label] of [
    ["redis", "Redis"],
    ["kafka", "Kafka"]
  ] as const) {
    const count = published.filter((question) => question.moduleId === moduleId).length;
    if (count < 20) {
      issues.push(issue("questions", `${label} requires at least 20 published questions; found ${count}.`));
    }
  }
  for (const module of catalog.modules) {
    const count = published.filter((question) => question.moduleId === module.id).length;
    if (count === 0) {
      issues.push(
        issue("questions", `Module ${module.id} requires at least one published question.`)
      );
    }
  }

  return issues;
}

export function assertValidCurriculum(value: unknown): asserts value is CurriculumCatalog {
  const issues = validateCurriculum(value);
  if (issues.length > 0) {
    throw new Error(
      `Curriculum validation failed with ${issues.length} issue(s):\n${issues
        .map((validationIssue) => `- ${validationIssue.path}: ${validationIssue.message}`)
        .join("\n")}`
    );
  }
}
