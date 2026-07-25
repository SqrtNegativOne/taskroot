import "./wrap.css";

interface ReflectionFieldProps {
    icon: string;
    iconColor: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}

function ReflectionField({ icon, iconColor, label, value, onChange }: ReflectionFieldProps) {
    return (
        <div className="wrap-reflection-field">
            <label className="wrap-reflection-label">
                <span style={{ color: iconColor }}>{icon}</span> {label}
            </label>
            <textarea
                className="wrap-reflection-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
            />
        </div>
    );
}

export interface ReflectionAnswers {
    good: string;
    bad: string;
    why: string;
    try: string;
}

interface WrapReflectionStepProps {
    answers: ReflectionAnswers;
    setAnswers: (answers: ReflectionAnswers) => void;
    onSleep: () => void;
}

export function WrapReflectionStep({ answers, setAnswers, onSleep }: WrapReflectionStepProps) {
    return (
        <div className="wrap-reflection-container">
            <ReflectionField
                icon="+"
                iconColor="var(--tag-green)"
                label="What was good today? (Observation)"
                value={answers.good}
                onChange={(val) => setAnswers({ ...answers, good: val })}
            />
            <ReflectionField
                icon="-"
                iconColor="var(--tag-red)"
                label="What was bad today? (Observation)"
                value={answers.bad}
                onChange={(val) => setAnswers({ ...answers, bad: val })}
            />
            <ReflectionField
                icon="?"
                iconColor="var(--tag-yellow)"
                label="Why the good/bad things happened? (Hypothesis)"
                value={answers.why}
                onChange={(val) => setAnswers({ ...answers, why: val })}
            />
            <ReflectionField
                icon="!"
                iconColor="var(--tag-purple)"
                label="What to try tomorrow? (Experiment)"
                value={answers.try}
                onChange={(val) => setAnswers({ ...answers, try: val })}
            />

            <button className="wrap-button wrap-button-danger" onClick={onSleep}>
                Go to Sleep (Shutdown PC)
            </button>
        </div>
    );
}
