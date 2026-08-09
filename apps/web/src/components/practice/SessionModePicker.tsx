import type { PracticeMode } from "@interview-architect/domain";
import { Icon } from "../Icon";

interface SessionModePickerProps {
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
  onStart: () => void;
  isStarting: boolean;
  disabled?: boolean;
  isResume?: boolean;
}

export function SessionModePicker({
  mode,
  onChange,
  onStart,
  isStarting,
  disabled = false,
  isResume = false
}: SessionModePickerProps): React.JSX.Element {
  return (
    <section className="studio-mode-picker" aria-labelledby="mode-picker-title">
      <div className="studio-mode-picker__intro">
        <p className="eyebrow">Choose your practice shape</p>
        <h2 id="mode-picker-title">How do you want to work this prompt?</h2>
        <p>Both modes keep your written thinking private to this browser. The mode is saved with the attempt once you begin.</p>
      </div>
      <fieldset className="studio-mode-options">
        <legend className="sr-only">Practice mode</legend>
        <label className={mode === "learn" ? "is-selected" : ""}>
          <input type="radio" name="practice-mode" value="learn" checked={mode === "learn"} onChange={() => onChange("learn")} disabled={disabled} />
          <span className="studio-mode-options__icon"><Icon name="lightbulb" size={19} /></span>
          <span><strong>Learn</strong><small>Hints and the answer framework are available as you work.</small></span>
        </label>
        <label className={mode === "mock" ? "is-selected" : ""}>
          <input type="radio" name="practice-mode" value="mock" checked={mode === "mock"} onChange={() => onChange("mock")} disabled={disabled} />
          <span className="studio-mode-options__icon"><Icon name="clock" size={19} /></span>
          <span><strong>Mock</strong><small>A timed interview simulation. Coaching stays hidden until you submit.</small></span>
        </label>
      </fieldset>
      <button className="button button--primary" type="button" disabled={disabled || isStarting} onClick={onStart}>
        <Icon name="play" size={16} />
        {isStarting ? "Starting your studio…" : isResume ? `Start another ${mode === "learn" ? "Learn" : "Mock"} session` : `Start ${mode === "learn" ? "Learn" : "Mock"} session`}
      </button>
    </section>
  );
}
