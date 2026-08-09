import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Difficulty, QuestionFormat } from "@interview-architect/domain";
import { catalogModules, catalogQuestions, catalogTopics, getSearchableText, moduleName, topicName } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { Icon } from "../components/Icon";
import { EmptyState, PageHeading, titleCase } from "../components/shared";
import { QuestionCard } from "../components/QuestionCard";

type CompletionFilter = "all" | "fresh" | "practiced" | "saved";

interface Filters {
  query: string;
  moduleId: string;
  topicId: string;
  difficulty: "" | Difficulty;
  type: "" | QuestionFormat;
  completion: CompletionFilter;
}

function initialFilters(params: URLSearchParams): Filters {
  const requestedModuleId = params.get("module") ?? "";
  const moduleId = catalogModules.some((module) => module.id === requestedModuleId) ? requestedModuleId : "";
  const requestedTopicId = params.get("topic") ?? "";
  const requestedTopic = catalogTopics.find((topic) => topic.id === requestedTopicId);
  const topicId = requestedTopic && (!moduleId || requestedTopic.moduleId === moduleId) ? requestedTopic.id : "";
  const difficulty = params.get("difficulty");
  const type = params.get("type");
  return {
    query: params.get("q") ?? "",
    moduleId,
    topicId,
    difficulty: difficulty === "foundation" || difficulty === "intermediate" || difficulty === "senior" ? difficulty : "",
    type: type === "concept" || type === "compare" || type === "calculation" || type === "design" || type === "debug" ? type : "",
    completion: params.get("status") === "fresh" || params.get("status") === "practiced" || params.get("status") === "saved" ? params.get("status") as CompletionFilter : "all"
  };
}

function filtersToSearchParams(filters: Filters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.query) next.set("q", filters.query);
  if (filters.moduleId) next.set("module", filters.moduleId);
  if (filters.topicId) next.set("topic", filters.topicId);
  if (filters.difficulty) next.set("difficulty", filters.difficulty);
  if (filters.type) next.set("type", filters.type);
  if (filters.completion !== "all") next.set("status", filters.completion);
  return next;
}

function readableFilter(filter: string): string {
  if (filter === "fresh") return "Not practiced";
  if (filter === "saved") return "Saved";
  return titleCase(filter);
}

export function QuestionBankPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  // The URL is the source of truth, so browser back/forward restores every
  // filter rather than leaving the controls on a stale local state.
  const filters = useMemo(() => initialFilters(searchParams), [searchParamString, searchParams]);
  const searchInput = useRef<HTMLInputElement>(null);
  const { attempts, bookmarks } = useLearner();
  const completed = useMemo(
    () => new Set(attempts.filter((attempt) => attempt.status === "completed").map((attempt) => attempt.questionId)),
    [attempts]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    return catalogQuestions.filter((question) => {
      if (query && !getSearchableText(question).includes(query)) return false;
      if (filters.moduleId && question.moduleId !== filters.moduleId) return false;
      if (filters.topicId && question.primaryTopicId !== filters.topicId) return false;
      if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
      if (filters.type && question.type !== filters.type) return false;
      if (filters.completion === "fresh" && completed.has(question.id)) return false;
      if (filters.completion === "practiced" && !completed.has(question.id)) return false;
      if (filters.completion === "saved" && !bookmarks.includes(question.id)) return false;
      return true;
    });
  }, [filters, completed, bookmarks]);

  const activeFilters = [filters.moduleId, filters.topicId, filters.difficulty, filters.type, filters.completion !== "all" ? filters.completion : ""].filter(Boolean);
  const setFilter = <Key extends keyof Filters>(key: Key, value: Filters[Key]) => {
    const next: Filters = { ...filters, [key]: value } as Filters;
    if (key === "moduleId") {
      const selectedTopic = catalogTopics.find((topic) => topic.id === next.topicId);
      if (next.moduleId && selectedTopic?.moduleId !== next.moduleId) {
        next.topicId = "";
      }
    }
    // Replacing free-text changes keeps the browser history useful; selecting
    // a filter or clearing one is a navigable state for back/forward.
    setSearchParams(filtersToSearchParams(next), { replace: key === "query" });
  };
  const clearFilters = () => setSearchParams(new URLSearchParams());

  return (
    <div className="question-bank page-enter">
      <PageHeading
        eyebrow="Question bank"
        title="Practice the decisions, not just the definitions."
        description={`${catalogQuestions.length} original prompts across the backend-system-design curriculum. Press / to jump to search.`}
      />

      <section className="question-search-panel" aria-label="Search and filter questions">
        <div className="search-input-wrap">
          <Icon name="search" size={20} />
          <label className="sr-only" htmlFor="question-search">Search questions</label>
          <input
            id="question-search"
            ref={searchInput}
            type="search"
            value={filters.query}
            onChange={(event) => setFilter("query", event.target.value)}
            placeholder="Search Redis, consumer lag, cache invalidation…"
          />
          <kbd>/</kbd>
        </div>
        <div className="filter-grid">
          <label className="filter-select"><span>Module</span><select value={filters.moduleId} onChange={(event) => setFilter("moduleId", event.target.value)}><option value="">All modules</option>{catalogModules.map((module) => <option value={module.id} key={module.id}>{module.title}</option>)}</select><Icon name="chevron-down" size={15} /></label>
          <label className="filter-select"><span>Topic</span><select value={filters.topicId} onChange={(event) => setFilter("topicId", event.target.value)}><option value="">All topics</option>{catalogTopics.filter((topic) => !filters.moduleId || topic.moduleId === filters.moduleId).map((topic) => <option value={topic.id} key={topic.id}>{topic.title}</option>)}</select><Icon name="chevron-down" size={15} /></label>
          <label className="filter-select"><span>Difficulty</span><select value={filters.difficulty} onChange={(event) => setFilter("difficulty", event.target.value as Filters["difficulty"])}><option value="">Any level</option><option value="foundation">Foundation</option><option value="intermediate">Intermediate</option><option value="senior">Senior</option></select><Icon name="chevron-down" size={15} /></label>
          <label className="filter-select"><span>Format</span><select value={filters.type} onChange={(event) => setFilter("type", event.target.value as Filters["type"])}><option value="">Any format</option><option value="concept">Concept</option><option value="compare">Compare</option><option value="calculation">Calculation</option><option value="design">Design</option><option value="debug">Debug</option></select><Icon name="chevron-down" size={15} /></label>
        </div>
        <div className="filter-bottom-row">
          <div className="filter-chips" role="group" aria-label="Practice status">
            {(["all", "fresh", "practiced", "saved"] as const).map((status) => <button key={status} type="button" className={filters.completion === status ? "is-active" : ""} aria-pressed={filters.completion === status} onClick={() => setFilter("completion", status)}>{status === "all" ? "All prompts" : readableFilter(status)}</button>)}
          </div>
          {activeFilters.length || filters.query ? <button className="text-button" type="button" onClick={clearFilters}><Icon name="x" size={15} />Clear filters</button> : null}
        </div>
      </section>

      <section className="question-results" aria-live="polite">
        <header className="question-results__header">
          <div><p className="eyebrow">{activeFilters.length ? `${activeFilters.length} filters applied` : "All prompts"}</p><h2>{filtered.length} {filtered.length === 1 ? "question" : "questions"} to explore</h2></div>
          <span className="results-note"><Icon name="sliders" size={16} />{filters.completion === "fresh" ? "Pick one and explain it out loud" : "Save anything worth revisiting"}</span>
        </header>
        {activeFilters.length ? <div className="active-filter-list">{filters.moduleId ? <span>{moduleName(filters.moduleId)}<button type="button" aria-label="Remove module filter" onClick={() => setFilter("moduleId", "")}><Icon name="x" size={13} /></button></span> : null}{filters.topicId ? <span>{topicName(filters.topicId)}<button type="button" aria-label="Remove topic filter" onClick={() => setFilter("topicId", "")}><Icon name="x" size={13} /></button></span> : null}{filters.difficulty ? <span>{readableFilter(filters.difficulty)}<button type="button" aria-label="Remove difficulty filter" onClick={() => setFilter("difficulty", "")}><Icon name="x" size={13} /></button></span> : null}{filters.type ? <span>{readableFilter(filters.type)}<button type="button" aria-label="Remove format filter" onClick={() => setFilter("type", "")}><Icon name="x" size={13} /></button></span> : null}</div> : null}
        {filtered.length ? <div className="question-grid">{filtered.map((question) => <QuestionCard question={question} key={question.id} />)}</div> : <EmptyState icon="search" title="No prompt matches that combination" description="Try clearing a filter or search for a broader system-design concept." actionTo="/questions" actionLabel="Reset question bank" />}
      </section>

      <aside className="question-bank__footnote"><Icon name="info" size={17} /><p>These prompts are designed for deliberate practice. A strong answer names assumptions, alternatives, and the cost of each tradeoff.</p><Link to="/curriculum">See the learning map <Icon name="arrow-right" size={14} /></Link></aside>
    </div>
  );
}
