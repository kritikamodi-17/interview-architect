import type { PracticeMode } from "@interview-architect/domain";
import type { PracticeProbeResponse } from "../../lib/study-storage";
import { Icon } from "../Icon";

interface InterviewerPanelProps {
  followUps: string[];
  probes: PracticeProbeResponse[];
  mode: PracticeMode;
  canAskNext: boolean;
  readOnly?: boolean;
  onRevealProbe: () => void;
  onResponseChange: (index: number, response: string) => void;
}

export function InterviewerPanel({
  followUps,
  probes,
  mode,
  canAskNext,
  readOnly = false,
  onRevealProbe,
  onResponseChange
}: InterviewerPanelProps): React.JSX.Element | null {
  if (!followUps.length) return null;
  return (
    <section className="interviewer-panel" aria-labelledby="interviewer-title">
      <header>
        <span><Icon name="target" size={18} /></span>
        <div>
          <p className="eyebrow">Deterministic interviewer</p>
          <h2 id="interviewer-title">Pressure-test your design</h2>
          <p>{mode === "mock" ? "The interviewer is waiting. Answer one follow-up before asking for another." : "Use editorial follow-ups to test the decisions you have already made."}</p>
        </div>
      </header>
      {probes.length ? <ol className="probe-list">{probes.map((probe) => {
        const prompt = followUps[probe.index];
        if (!prompt) return null;
        const id = `probe-response-${probe.index}`;
        return <li key={probe.index}>
          <span className="probe-list__number">{String(probe.index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{prompt}</strong>
            <label htmlFor={id}>Your response <span>private</span></label>
            <textarea id={id} value={probe.response} onChange={(event) => onResponseChange(probe.index, event.target.value)} placeholder="Talk through the decision, impact, and fallback…" readOnly={readOnly} />
          </div>
        </li>;
      })}</ol> : <p className="interviewer-panel__empty">No follow-up has been asked yet. Start with your core design, then invite an interviewer probe.</p>}
      {readOnly ? <p className="interviewer-panel__complete"><Icon name="check" size={15} />Saved interviewer responses are available for review.</p> : probes.length < followUps.length ? <div className="interviewer-panel__action"><button className="button button--secondary" type="button" onClick={onRevealProbe} disabled={!canAskNext}><Icon name="arrow-right" size={16} />Ask follow-up {probes.length + 1} of {followUps.length}</button>{mode === "mock" && !canAskNext ? <p>Finish your current answer before asking the interviewer to move on.</p> : null}</div> : <p className="interviewer-panel__complete"><Icon name="check" size={15} />You worked through every prepared follow-up.</p>}
    </section>
  );
}
