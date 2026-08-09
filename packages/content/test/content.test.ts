import { describe, expect, it } from "vitest";

import {
  curriculum,
  filterQuestions,
  getCurriculumStats,
  getQuestionBySlug,
  getQuestionsForTopic,
  modules,
  questions,
  searchQuestions,
  topics,
  validateCurriculum
} from "../src/index.js";

describe("Interview Architect curriculum", () => {
  it("is structurally and relationally valid", () => {
    expect(validateCurriculum(curriculum)).toEqual([]);
    expect(modules).toHaveLength(8);
    expect(topics.length).toBeGreaterThanOrEqual(16);
    expect(questions.filter((question) => question.status === "published")).toHaveLength(68);
    expect(questions.filter((question) => question.moduleId === "redis")).toHaveLength(20);
    expect(questions.filter((question) => question.moduleId === "kafka")).toHaveLength(24);
    for (const module of modules) {
      expect(questions.some((question) => question.moduleId === module.id)).toBe(true);
    }
  });

  it("makes every published question practice-ready", () => {
    for (const question of questions) {
      expect(question.status).toBe("published");
      expect(question.version).toBeGreaterThan(0);
      expect(question.hints.length).toBeGreaterThanOrEqual(2);
      expect(question.prompt.followUps.length).toBeGreaterThanOrEqual(2);
      expect(question.answer.sections.length).toBeGreaterThanOrEqual(2);
      expect(question.answer.tradeoffs.length).toBeGreaterThan(0);
      expect(question.answer.failureModes.length).toBeGreaterThan(0);
      expect(question.rubric).toHaveLength(3);
      expect(question.rubric.reduce((total, item) => total + item.weight, 0)).toBe(100);
      expect(question.references.every((reference) => reference.href.startsWith("https://"))).toBe(true);
    }
  });

  it("rejects cross-record references and unapproved reference hosts", () => {
    const invalid = JSON.parse(JSON.stringify(curriculum)) as typeof curriculum;
    const firstQuestion = invalid.questions[0];
    if (!firstQuestion) throw new Error("Fixture unexpectedly has no questions.");
    firstQuestion.primaryTopicId = "missing-topic";
    firstQuestion.id = `missing-topic:${firstQuestion.slug}`;
    firstQuestion.references[0] = {
      label: "Unapproved source",
      href: "https://example.invalid/article"
    };

    const issues = validateCurriculum(invalid);
    expect(issues.some((issue) => issue.message.includes("Unknown topic id"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("approved source list"))).toBe(true);
  });

  it("requires at least one published question for every visible module", () => {
    const withoutSecurity = {
      ...curriculum,
      questions: curriculum.questions.filter(
        (question) => question.moduleId !== "security-case-studies"
      )
    };

    const issues = validateCurriculum(withoutSecurity);
    expect(
      issues.some((issue) =>
        issue.message.includes("Module security-case-studies requires at least one published question")
      )
    ).toBe(true);
  });

  it("filters by facets with all requested tags", () => {
    const streamQuestions = filterQuestions(questions, {
      moduleId: "redis",
      tags: ["redis-streams", "idempotency"],
      difficulty: "senior"
    });

    expect(streamQuestions.map((question) => question.slug)).toContain(
      "design-idempotent-redis-stream-worker"
    );
    expect(
      streamQuestions.every(
        (question) =>
          question.moduleId === "redis" &&
          question.difficulty === "senior" &&
          question.tags.includes("redis-streams") &&
          question.tags.includes("idempotency")
      )
    ).toBe(true);
  });

  it("ranks full-text search and supports direct selectors", () => {
    const results = searchQuestions("redis streams pending consumer group");
    expect(results.map((question) => question.slug)).toContain("recover-redis-streams-pending-work");

    expect(getQuestionBySlug("design-transactional-outbox-to-kafka")?.moduleId).toBe("kafka");
    expect(getQuestionsForTopic("kafka-delivery-schema").length).toBeGreaterThanOrEqual(5);
  });

  it("reports useful catalog totals", () => {
    const stats = getCurriculumStats();
    expect(stats).toMatchObject({
      moduleCount: 8,
      questionCount: 68,
      publishedQuestionCount: 68,
      questionCountByModule: {
        redis: 20,
        kafka: 24,
        "distributed-systems": 4,
        "security-case-studies": 4
      }
    });
    expect(stats.questionCountByDifficulty.senior).toBeGreaterThan(10);
  });
});
