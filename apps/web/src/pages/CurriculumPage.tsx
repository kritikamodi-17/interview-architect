import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { catalogModules, getModuleQuestions, getModuleTopics, getTopicQuestions } from "../data/catalog";
import { useLearner } from "../hooks/useLearner";
import { Icon } from "../components/Icon";
import { PageHeading, ProgressBar } from "../components/shared";

export function CurriculumPage() {
  const { attempts } = useLearner();
  const completed = useMemo(
    () => new Set(attempts.filter((attempt) => attempt.status === "completed").map((attempt) => attempt.questionId)),
    [attempts]
  );
  const [openModule, setOpenModule] = useState<string | null>(catalogModules[0]?.id ?? null);

  return (
    <div className="curriculum page-enter">
      <PageHeading
        eyebrow="The learning map"
        title="A curriculum that connects the pieces."
        description="Move from the primitives to the tradeoffs. Redis and Kafka go deep; every module reinforces the system-design thinking around them."
        action={<Link className="button button--secondary" to="/questions"><Icon name="search" size={16} />Search prompts</Link>}
      />

      <section className="curriculum-intro">
        <div><span className="curriculum-intro__icon"><Icon name="compass" size={20} /></span><div><strong>How to use this map</strong><p>Choose a module, learn the vocabulary, then practice a question while explaining your decisions aloud.</p></div></div>
        <Link className="text-link" to="/questions?module=redis">Start with Redis <Icon name="arrow-right" size={14} /></Link>
      </section>

      <div className="curriculum-jump" aria-label="Jump to a module">
        {catalogModules.map((module, index) => (
          <a key={module.id} href={`#${module.slug}`}><span>{String(index + 1).padStart(2, "0")}</span>{module.title}</a>
        ))}
      </div>

      <section className="curriculum-list" aria-label="Learning modules">
        {catalogModules.map((module, index) => {
          const moduleQuestions = getModuleQuestions(module.id);
          const moduleTopics = getModuleTopics(module.id);
          const doneCount = moduleQuestions.filter((question) => completed.has(question.id)).length;
          const isOpen = openModule === module.id;
          const percent = moduleQuestions.length ? (doneCount / moduleQuestions.length) * 100 : 0;
          return (
            <article
              id={module.slug}
              className={`curriculum-module${isOpen ? " curriculum-module--open" : ""}`}
              key={module.id}
              style={{ "--module-accent": module.accent } as CSSProperties}
            >
              <button
                className="curriculum-module__summary"
                type="button"
                aria-expanded={isOpen}
                aria-controls={`module-${module.id}`}
                onClick={() => setOpenModule((current) => (current === module.id ? null : module.id))}
              >
                <span className="curriculum-module__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="curriculum-module__main">
                  <span className="curriculum-module__eyebrow">Module {String(index + 1).padStart(2, "0")} · {moduleTopics.length} topics</span>
                  <strong>{module.title}</strong>
                  <small>{module.description}</small>
                </span>
                <span className="curriculum-module__progress"><span>{doneCount}/{moduleQuestions.length} practiced</span><ProgressBar value={percent} /></span>
                <span className="curriculum-module__chevron"><Icon name="chevron-down" size={20} /></span>
              </button>

              {isOpen ? (
                <div className="curriculum-module__details" id={`module-${module.id}`}>
                  <div className="curriculum-module__details-head">
                    <p>What you will learn</p>
                    <Link to={`/questions?module=${encodeURIComponent(module.id)}`} className="button button--secondary button--small">Practice this module <Icon name="arrow-right" size={15} /></Link>
                  </div>
                  <div className="topic-grid">
                    {moduleTopics.map((topic) => {
                      const topicQuestions = getTopicQuestions(topic.id);
                      const topicDone = topicQuestions.filter((question) => completed.has(question.id)).length;
                      return (
                        <Link className="topic-card" to={`/questions?topic=${encodeURIComponent(topic.id)}`} key={topic.id}>
                          <div className="topic-card__top"><span>{topic.order.toString().padStart(2, "0")}</span><span>{topicDone}/{topicQuestions.length}<Icon name="arrow-up-right" size={15} /></span></div>
                          <h3>{topic.title}</h3>
                          <p>{topic.description}</p>
                          <ul>{topic.learningObjectives.slice(0, 2).map((objective) => <li key={objective}><Icon name="check" size={13} />{objective}</li>)}</ul>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="curriculum-closing">
        <div><p className="eyebrow">A useful rhythm</p><h2>Learn the idea. Practice the explanation. Revisit the gap.</h2></div>
        <div className="curriculum-closing__steps"><span><b>01</b>Read a topic</span><Icon name="arrow-right" size={16} /><span><b>02</b>Practice a prompt</span><Icon name="arrow-right" size={16} /><span><b>03</b>Review your tradeoffs</span></div>
      </section>
    </div>
  );
}
