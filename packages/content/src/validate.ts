import { curriculum } from "./data.js";
import { validateCurriculum } from "./schema.js";

export function formatValidationIssues(
  issues: ReadonlyArray<{ path: string; message: string }>
): string {
  return issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
}

export function runValidation(): void {
  const issues = validateCurriculum(curriculum);
  if (issues.length > 0) {
    throw new Error(`Curriculum validation failed:\n${formatValidationIssues(issues)}`);
  }

  const published = curriculum.questions.filter((question) => question.status === "published").length;
  const redis = curriculum.questions.filter((question) => question.moduleId === "redis").length;
  const kafka = curriculum.questions.filter((question) => question.moduleId === "kafka").length;
  console.log(
    `Curriculum ${curriculum.version} is valid: ${curriculum.modules.length} modules, ${curriculum.topics.length} topics, ${published} published questions (Redis ${redis}, Kafka ${kafka}).`
  );
}

runValidation();
