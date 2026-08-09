import { describe, expect, it } from "vitest";
import {
  calculateMastery,
  nextReviewAt,
  recommendNextQuestion,
  type InterviewQuestion,
  type LearnerProgress
} from "../src/index";

const question = (id: string, topic = "redis-cache"): InterviewQuestion => ({
  id,
  slug: id,
  version: 1,
  status: "published",
  moduleId: "caching-redis",
  primaryTopicId: topic,
  title: id,
  type: "concept",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  tags: ["redis", "cache"],
  prerequisites: [],
  prompt: { question: id, followUps: [] },
  hints: [],
  answer: { summary: "", sections: [], tradeoffs: [], failureModes: [], keyTerms: [] },
  rubric: [],
  commonPitfalls: [],
  references: [],
  reviewedAt: "2026-08-09"
});

describe("study coach", () => {
  it("calculates zero mastery without completed self-assessments", () => {
    expect(calculateMastery([])).toBe(0);
  });

  it("schedules stronger self-assessments further into the future", () => {
    const start = new Date("2026-08-09T00:00:00.000Z");
    expect(nextReviewAt(0, start)).toBe("2026-08-10T00:00:00.000Z");
    expect(nextReviewAt(4, start)).toBe("2026-08-23T00:00:00.000Z");
  });

  it("prioritizes a new question in a weak, preferred topic", () => {
    const progress: LearnerProgress = {
      userId: "learner-1",
      attempts: [],
      bookmarks: [],
      mastery: [
        {
          userId: "learner-1",
          topicId: "redis-cache",
          masteryScore: 20,
          confidence: 1,
          attemptsCount: 1
        }
      ]
    };
    const result = recommendNextQuestion(
      [question("redis-new", "redis-cache"), question("kafka-new", "kafka-basics")],
      progress,
      { availableMinutes: 15, targetRole: "backend", preferredTopicId: "redis-cache" }
    );

    expect(result?.question.id).toBe("redis-new");
    expect(result?.reason).toContain("fresh practice");
  });
});
