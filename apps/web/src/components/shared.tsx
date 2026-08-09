import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Difficulty, QuestionFormat } from "@interview-architect/domain";
import { Icon, type IconName } from "./Icon";

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
}

export function titleCase(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function difficultyLabel(value: Difficulty): string {
  return value === "foundation" ? "Foundation" : value === "intermediate" ? "Intermediate" : "Senior";
}

export function typeLabel(value: QuestionFormat): string {
  const labels: Record<QuestionFormat, string> = {
    concept: "Concept",
    compare: "Compare",
    calculation: "Calculation",
    design: "Design",
    debug: "Debug"
  };
  return labels[value];
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`badge badge--${difficulty}`}>{difficultyLabel(difficulty)}</span>;
}

export function TypeBadge({ type }: { type: QuestionFormat }) {
  return <span className="badge badge--neutral">{typeLabel(type)}</span>;
}

export function ProgressBar({ value, label, className = "" }: { value: number; label?: string; className?: string }) {
  const percent = clampPercent(value);
  const accessibleLabel = label ? `${label} progress` : "Progress";
  return (
    <div className={`progress-wrap ${className}`}>
      {label ? <div className="progress-label"><span>{label}</span><strong>{percent}%</strong></div> : null}
      <div className="progress-track" role="progressbar" aria-label={accessibleLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span className="progress-value" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  detail,
  tone = "dark"
}: {
  icon: IconName;
  value: string | number;
  label: string;
  detail?: string;
  tone?: "dark" | "cream" | "mint" | "coral";
}) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon"><Icon name={icon} size={19} /></span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-heading__description">{description}</p> : null}
      </div>
      {action ? <div className="page-heading__action">{action}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon = "search",
  title,
  description,
  actionTo,
  actionLabel
}: {
  icon?: IconName;
  title: string;
  description: string;
  actionTo?: string;
  actionLabel?: string;
}) {
  return (
    <section className="empty-state" aria-live="polite">
      <span className="empty-state__icon"><Icon name={icon} size={25} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionTo && actionLabel ? <Link className="button button--secondary" to={actionTo}>{actionLabel}<Icon name="arrow-right" size={16} /></Link> : null}
    </section>
  );
}

export function LoadingBlock({ label = "Loading your study space" }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="loading-block__dots" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
    </div>
  );
}

export function InlineError({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="inline-error" role="alert">
      <Icon name="info" size={18} />
      <span>{message}</span>
      {onRetry ? <button className="text-button" type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}
