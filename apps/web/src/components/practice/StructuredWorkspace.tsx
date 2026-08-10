import {
  WORKSPACE_SECTION_IDS,
  type WorkspaceSectionId,
  type WorkspaceSections
} from "../../lib/study-storage";
import type { LocalSaveState } from "../../hooks/usePracticeSession";
import { Icon } from "../Icon";

const SECTION_DETAILS: Record<WorkspaceSectionId, { label: string; prompt: string; placeholder: string }> = {
  clarifications: {
    label: "Clarifications",
    prompt: "What would you ask before committing to a design?",
    placeholder: "Users, access pattern, product boundary, non-goals…"
  },
  scale: {
    label: "Scale & load",
    prompt: "Name the workload and the assumptions that drive your choices.",
    placeholder: "Reads/writes, peak traffic, payload size, growth…"
  },
  architecture: {
    label: "Architecture",
    prompt: "Describe the request path and the responsibilities of each component.",
    placeholder: "Client → edge → service → datastore, plus why…"
  },
  apiAndDataModel: {
    label: "API & data model",
    prompt: "Make ownership, keys, and important contracts concrete.",
    placeholder: "Endpoints, entities, indexes, idempotency boundaries…"
  },
  reliability: {
    label: "Reliability",
    prompt: "How does the design behave when dependencies or messages fail?",
    placeholder: "Retries, timeouts, backpressure, recovery…"
  },
  observabilityAndSecurity: {
    label: "Observability & security",
    prompt: "What would prove the system is healthy and safe?",
    placeholder: "SLIs, alerts, audit trail, authz, data exposure…"
  },
  tradeoffs: {
    label: "Tradeoffs",
    prompt: "Name a rejected option and why this choice is appropriate now.",
    placeholder: "I chose X over Y because…, accepting…"
  },
  reflection: {
    label: "Reflection",
    prompt: "Capture the one thing you would make clearer next time.",
    placeholder: "I need to explain…, validate…, or simplify…"
  }
};

interface StructuredWorkspaceProps {
  sections: WorkspaceSections;
  saveState: LocalSaveState;
  onChange: (section: WorkspaceSectionId, value: string) => void;
  readOnly?: boolean;
}

function saveMessage(saveState: LocalSaveState): string {
  if (saveState === "saving") return "Saving privately on this device…";
  if (saveState === "saved") return "Saved privately on this device";
  if (saveState === "warning") return "This browser cannot save private notes right now";
  return "Your notes stay only in this browser";
}

export function StructuredWorkspace({ sections, saveState, onChange, readOnly = false }: StructuredWorkspaceProps): React.JSX.Element {
  const completed = WORKSPACE_SECTION_IDS.filter((section) => sections[section].trim()).length;
  return (
    <section className="structured-workspace" aria-labelledby="workspace-title">
      <header className="structured-workspace__header">
        <div>
          <p className="eyebrow">Private design workspace</p>
          <h2 id="workspace-title">Make your reasoning inspectable</h2>
          <p>Use the structure an interviewer expects. None of this text is sent to the study service.</p>
        </div>
        <div className={`workspace-save-state workspace-save-state--${saveState}`} role="status" aria-live="polite" aria-atomic="true">
          <Icon name={saveState === "warning" ? "info" : saveState === "saved" ? "check" : "clock"} size={15} />
          <span>{saveMessage(saveState)}</span>
          <small>{completed}/8 sections started</small>
        </div>
      </header>
      <form className="workspace-grid" onSubmit={(event) => event.preventDefault()}>
        {WORKSPACE_SECTION_IDS.map((section) => {
          const detail = SECTION_DETAILS[section];
          const id = `workspace-${section}`;
          return (
            <section className="workspace-field" key={section}>
              <label htmlFor={id}><span>{detail.label}</span><small>{detail.prompt}</small></label>
              <textarea
                id={id}
                value={sections[section]}
                onChange={(event) => onChange(section, event.target.value)}
                placeholder={detail.placeholder}
                aria-describedby={`${id}-hint`}
                readOnly={readOnly}
              />
              <span className="sr-only" id={`${id}-hint`}>{readOnly ? "This saved review is read-only and remains only in this browser." : "Saved only in this browser."}</span>
            </section>
          );
        })}
      </form>
    </section>
  );
}
