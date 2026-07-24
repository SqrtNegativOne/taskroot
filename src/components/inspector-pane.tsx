import React from "react";
import type { AppEvent, AppTask } from "../core/domain/models";

const TaskStatusSelect = ({ value, onChange }: { value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select value={value} onChange={onChange}>
        <option value="todo">todo</option>
        <option value="next-up">next up</option>
        <option value="doing">doing</option>
        <option value="done">done</option>
    </select>
);

const RepeatSelect = ({ value, disabled, onChange }: { value: string, disabled: boolean, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select value={value} disabled={disabled} onChange={onChange}>
        <option value="">None</option>
        <option value="FREQ=DAILY">Daily</option>
        <option value="FREQ=WEEKLY">Weekly</option>
        <option value="FREQ=MONTHLY">Monthly</option>
        <option value="FREQ=YEARLY">Yearly</option>
    </select>
);
import { useCalendars } from "../core/store/hooks";

interface TitleInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    onEnter?: () => void;
    style?: React.CSSProperties;
    className?: string;
    autoFocus?: boolean;
}

export function TitleInput({
    value,
    onChange,
    disabled,
    onEnter,
    style = {},
    className = "",
    autoFocus = false,
}: TitleInputProps) {
    const [localValue, setLocalValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
        }
    }, [autoFocus]);

    const handleBlur = () => {
        if (localValue !== value) onChange(localValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (e.target instanceof HTMLElement) e.target.blur();
            if (onEnter) onEnter();
        }
    };

    return (
        <input
            ref={inputRef}
            value={localValue || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={style}
            className={className}
            spellCheck={false}
        />
    );
}

export function minToTime(m: number): string {
    if (typeof m !== "number" || isNaN(m)) return "";
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function timeToMin(t: string): number {
    if (!t) return 0;
    const [hh, mm] = t.split(":");
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

export function TagsInput({ tags, allTags, onChange }: { tags: string[], allTags: string[], onChange: (tags: string[]) => void }) {
    const [inputValue, setInputValue] = React.useState("");
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
        } else if (
            e.key === "Backspace" &&
            inputValue === "" &&
            tags.length > 0
        ) {
            onChange(tags.slice(0, -1));
        }
    };

    const addTag = (tagStr: string) => {
        const t = tagStr.trim();
        if (t && !tags.includes(t)) {
            onChange([...tags, t]);
        }
        setInputValue("");
    };

    const removeTag = (t: string) => {
        onChange(tags.filter((x) => x !== t));
    };

    const suggestions = allTags.filter(
        (t) =>
            t.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(t),
    );

    return (
        <div className="tags-input-container">
            {tags.map((t: string) => (
                <span key={t} className="tag-chip">
                    {t}{" "}
                    <button type="button" onClick={() => removeTag(t)}>
                        ×
                    </button>
                </span>
            ))}
            <div style={{ position: "relative", flex: 1 }}>
                <input
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                    }
                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                />
                {showSuggestions && inputValue && suggestions.length > 0 && (
                    <div className="tags-suggestions">
                        {suggestions.map((s) => (
                            <button
                                type="button"
                                key={s}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(s);
                                }}
                                className="tag-suggestion"
                                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean, onChange: (val: boolean) => void, label: string, disabled?: boolean }) {
    return (
        <button
            type="button"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                background: "none",
                border: "none",
                color: "inherit",
                padding: 0,
                font: "inherit",
            }}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div className={`toggle-switch ${checked ? "is-on" : ""}`}>
                <div className="toggle-switch-thumb" />
            </div>
            <span style={{ fontSize: "0.9em" }}>{label}</span>
        </button>
    );
}

export function DescriptionInput({ value, onChange }: { value: string | undefined | null, onChange: (val: string) => void }) {
    const [editing, setEditing] = React.useState(false);
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    if (!editing) {
        return (
            <button
                type="button"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditing(true);
                    }
                }}
                onClick={() => setEditing(true)}
                style={{
                    minHeight: "24px",
                    cursor: "text",
                    padding: "0",
                    color: value ? "var(--fg)" : "var(--fg-dim)",
                    borderRadius: "4px",
                    background: "none",
                    border: "none",
                    font: "inherit",
                    textAlign: "left",
                    width: "100%",
                }}
            >
                {value || "Add description..."}
            </button>
        );
    }

    return (
        <textarea
            ref={(el) => { if (el && editing) el.focus(); }}
            value={localValue || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
            onBlur={() => {
                setEditing(false);
                if (localValue !== value) onChange(localValue || "");
            }}
            rows={5}
            style={{
                width: "100%",
                resize: "vertical",
                padding: "4px",
                fontFamily: "inherit",
                border: "1px solid var(--border)",
                background: "var(--bg-input, var(--bg-surface))",
                color: "var(--fg)",
                borderRadius: "4px",
            }}
            placeholder="Add a description..."
            spellCheck={false}
        />
    );
}

interface InspectorPaneProps {
    inspectorState: { type: string; id: string } | null;
    onClose: () => void;
    tasks: AppTask[];
    setTasks: React.Dispatch<React.SetStateAction<AppTask[]>>;
    events: AppEvent[];
    setEvents: React.Dispatch<React.SetStateAction<AppEvent[]>>;
    
}

export function InspectorPane({
    inspectorState,
    onClose,
    tasks,
    setTasks,
    events,
    setEvents,
    
}: InspectorPaneProps) {
    const [activeState, setActiveState] = React.useState<{ type: string; id: string } | null>(null);
    const paneRef = React.useRef<HTMLDivElement>(null);
    const [calendars] = useCalendars() as unknown as [{ id: string, summary?: string | undefined }[], unknown, unknown];

    React.useEffect(() => {
        if (inspectorState) setActiveState(inspectorState);
    }, [inspectorState]);

    const currentState = inspectorState || activeState;

    const isCurrentTask = currentState?.type === "task";
    const currentItem = currentState
        ? isCurrentTask
            ? tasks.find((t: AppTask) => t.id === currentState.id)
            : events.find((e: AppEvent) => e.id === currentState.id) ||
              events.find((e: AppEvent) => e.id === currentState.id.split("_")[0])
        : null;

    const [showEndDate, setShowEndDate] = React.useState(false);
    React.useEffect(() => {
        if (
            currentItem &&
            "type" in currentItem &&
            currentItem.type !== "task" &&
            (currentItem as AppEvent).endDate &&
            (currentItem as AppEvent).date &&
            (currentItem as AppEvent).endDate !== (currentItem as AppEvent).date
        ) {
            setShowEndDate(true);
        } else {
            setShowEndDate(false);
        }
    }, [currentItem?.id, currentItem]);

    const isReadOnlyCalendar = React.useMemo(() => {
        if (isCurrentTask || !currentItem) return false;
        const calId = (currentItem as AppEvent).googleCalendarId || "primary";
        const cal = calendars.find((c: any) => c.id === calId) as any;
        return cal && (cal.accessRole === "reader" || cal.accessRole === "freeBusyReader");
    }, [isCurrentTask, currentItem, calendars]);

    const handleClose = React.useCallback(() => {
        if (!(inspectorState && currentItem && currentItem.isDraft)) {
            onClose();
            return;
        }

        if (isCurrentTask) {
            setTasks((ts: AppTask[]) => {
                const t = ts.find((x: AppTask) => x.id === currentItem.id);
                if (t && t.isDraft) {
                    setEvents((es: AppEvent[]) =>
                        es.filter((e: AppEvent) => e.taskId !== currentItem.id),
                    );
                    return ts.filter((x: AppTask) => x.id !== currentItem.id);
                }
                return ts;
            });
        } else {
            setEvents((es: AppEvent[]) => {
                const e = es.find((x: AppEvent) => x.id === currentItem.id);
                if (e && e.isDraft)
                    return es.filter((x: AppEvent) => x.id !== currentItem.id);
                return es;
            });
        }

        onClose();
    }, [
        inspectorState,
        currentItem,
        isCurrentTask,
        setTasks,
        setEvents,
        onClose,
    ]);

    React.useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            if (
                inspectorState &&
                paneRef.current &&
                !paneRef.current.contains(e.target as Node)
            ) {
                handleClose();
            }
        }
        document.addEventListener("pointerdown", handleClickOutside);
        return () =>
            document.removeEventListener("pointerdown", handleClickOutside);
    }, [inspectorState, handleClose]);

    const isOpen = !!(inspectorState && currentItem);

    const title = currentItem
        ? isCurrentTask
            ? (currentItem as AppTask).title
            : (currentItem as AppEvent).taskId
              ? tasks.find((t: AppTask) => t.id === (currentItem as AppEvent).taskId)?.title
              : (currentItem as AppEvent).title
        : "";

    const updateTask = (id: string, updates: Partial<AppTask>) =>
        setTasks((ts: AppTask[]) =>
            ts.map((t: AppTask) =>
                t.id === id ? { ...t, ...updates, isDraft: false } : t,
            ),
        );
    const deleteTask = (id: string) => setTasks((ts: AppTask[]) => ts.filter((t: AppTask) => t.id !== id));
    const updateEvent = (id: string, updates: Partial<AppEvent>) =>
        setEvents((es: AppEvent[]) =>
            es.map((e: AppEvent) =>
                e.id === id ? { ...e, ...updates, isDraft: false } : e,
            ),
        );
    const deleteEvent = (id: string) =>
        setEvents((es: AppEvent[]) => es.filter((e: AppEvent) => e.id !== id));

    return (
        <div
            ref={paneRef}
            className={`inspector-pane ${isOpen ? "is-open" : ""}`}
        >
            {currentItem && (
                <React.Fragment key={currentItem.id}>
                    <div
                        className="inspector-hd"
                        style={{
                            padding: "0 8px",
                            borderBottom: "none",
                            background: "transparent",
                        }}
                    >
                        <button
                            className="inspector-icon-btn"
                            onClick={handleClose}
                            title="Close Pane"
                        >
                            <span className="material-symbols-outlined">
                                keyboard_double_arrow_right
                            </span>
                        </button>
                        <button
                            className="inspector-icon-btn"
                            onClick={() => {
                                if (isCurrentTask) {
                                    deleteTask(currentItem.id);
                                    setEvents((es: AppEvent[]) =>
                                        es.filter(
                                            (e) => e.taskId !== currentItem.id,
                                        ),
                                    );
                                } else {
                                    deleteEvent(currentItem.id);
                                }
                                handleClose();
                            }}
                            title="Delete"
                            disabled={isReadOnlyCalendar}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "20px", opacity: isReadOnlyCalendar ? 0.3 : 1 }}
                            >
                                delete
                            </span>
                        </button>
                    </div>
                    <div className="inspector-body" style={{ paddingTop: 0 }}>
                        <div
                            className="inspector-field"
                            style={{ marginTop: "24px", marginBottom: "4px" }}
                        >
                            <TitleInput
                                value={title || ""}
                                onChange={(newTitle) => {
                                    if (isCurrentTask)
                                        updateTask(currentItem.id, {
                                            title: newTitle,
                                        });
                                    else
                                        updateEvent(currentItem.id, {
                                            title: newTitle,
                                        });
                                }}
                                disabled={Boolean(!isCurrentTask && (currentItem as AppEvent).taskId) || isReadOnlyCalendar}
                                onEnter={handleClose}
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "normal",
                                    border: "none",
                                    background: "transparent",
                                    padding: "0",
                                    outline: "none",
                                    width: "100%",
                                    color: "var(--fg)",
                                }}
                                autoFocus={Boolean((currentItem as AppTask).isDraft)} // eslint-disable-line jsx-a11y/no-autofocus
                            />
                        </div>
                        <div
                            className="inspector-field"
                            style={{
                                flexDirection: "column",
                                alignItems: "flex-start",
                            }}
                        >
                            <DescriptionInput
                                value={((currentItem as AppEvent).description as string) || ""}
                                onChange={(desc) => {
                                    if (isReadOnlyCalendar) return;
                                    if (isCurrentTask)
                                        updateTask(currentItem.id, {
                                            description: desc,
                                        });
                                    else
                                        updateEvent(currentItem.id, {
                                            description: desc,
                                        });
                                }}
                            />
                        </div>

                        {isReadOnlyCalendar && (
                            <div className="inspector-field" style={{color: "var(--tag-red)", fontSize: "0.85em", marginTop: "8px"}}>
                                This event belongs to a read-only calendar and cannot be modified.
                            </div>
                        )}

                        {isCurrentTask && (
                            <>
                                <div className="inspector-row">
                                    <div className="inspector-field">
                                        <label htmlFor={`status-${currentItem.id}`}>Status</label>
                                        <TaskStatusSelect
                                            value={(currentItem as AppTask).status}
                                            onChange={(e) =>
                                                updateTask(currentItem.id, {
                                                    status: e.target.value as AppTask["status"],
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="inspector-field">
                                        <label htmlFor={`priority-${currentItem.id}`}>Priority</label>
                                        <input
                                            id={`priority-${currentItem.id}`}
                                            type="number"
                                            min="0"
                                            max="4"
                                            value={(currentItem as AppTask).priority ?? 2}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                updateTask(currentItem.id, {
                                                    priority: Math.max(
                                                        0,
                                                        Math.min(
                                                            4,
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        ),
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="inspector-field">
                                    <label htmlFor={`duration-${currentItem.id}`}>Duration (min)</label>
                                    <input
                                        id={`duration-${currentItem.id}`}
                                        type="number"
                                        placeholder="Unset"
                                        value={
                                            !(currentItem as AppTask).est
                                                ? ""
                                                : (currentItem as AppTask).est
                                        }
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            let val = e.target.value
                                                ? parseInt(e.target.value)
                                                : 0;
                                            if (val > 60) val = 60;
                                            updateTask(currentItem.id, {
                                                est: val,
                                            });
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {!isCurrentTask && (
                            <>
                                <div
                                    className="inspector-field"
                                    style={{ marginTop: "8px" }}
                                >
                                    <select
                                        value={(currentItem as AppEvent).type}
                                        disabled={isReadOnlyCalendar}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const type = e.target.value;
                                            if (type === "plan") {
                                                updateEvent(currentItem.id, {
                                                    type,
                                                });
                                            } else {
                                                updateEvent(currentItem.id, {
                                                    type,
                                                    taskId: undefined,
                                                });
                                            }
                                        }}
                                    >
                                        <option value="busy">Busy</option>
                                        <option value="info">
                                            Informational
                                        </option>
                                        <option value="plan">
                                            Plan (task-based)
                                        </option>
                                    </select>
                                </div>

                                {(currentItem as AppEvent).type === "plan" && (
                                    <div className="inspector-field">
                                        <select
                                            value={(currentItem as AppEvent).taskId || ""}
                                            disabled={isReadOnlyCalendar}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                const taskId = e.target.value;
                                                updateEvent(currentItem.id, {
                                                    taskId: taskId || undefined,
                                                });
                                            }}
                                        >
                                            <option value="">
                                                -- No task attached --
                                            </option>
                                            {tasks.map((t: AppTask) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div
                                    className="inspector-field"
                                    style={{ marginTop: "8px" }}
                                >
                                    <label htmlFor={`calendar-${currentItem.id}`}>Calendar</label>
                                    <select
                                        id={`calendar-${currentItem.id}`}
                                        value={
                                            (currentItem as AppEvent).googleCalendarId ||
                                            "primary"
                                        }
                                        disabled={isReadOnlyCalendar}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const cal = calendars.find(
                                                (c: { id: string, summary?: string }) => c.id === e.target.value,
                                            );
                                            updateEvent(currentItem.id, {
                                                googleCalendarId:
                                                    e.target.value,
                                                category: cal
                                                    ? cal.summary
                                                    : "",
                                            });
                                        }}
                                    >
                                        {calendars.map((c: any) => (
                                            <option 
                                                key={c.id} 
                                                value={c.id}
                                                disabled={c.accessRole === "reader" || c.accessRole === "freeBusyReader"}
                                            >
                                                {c.summary}{c.accessRole === "reader" || c.accessRole === "freeBusyReader" ? " (Read-Only)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div
                                    className="inspector-field"
                                    style={{ marginTop: "8px" }}
                                >
                                    <label htmlFor={`rrule-${currentItem.id}`}>Repeat (RRULE)</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                            width: "100%",
                                        }}
                                    >
                                        <RepeatSelect
                                            value={(currentItem as AppEvent).rrule || ""}
                                            disabled={isReadOnlyCalendar}
                                            onChange={(e) =>
                                                updateEvent(currentItem.id, {
                                                    rrule: e.target.value || undefined,
                                                })
                                            }
                                        />
                                        <input
                                            type="text"
                                            placeholder="Custom RRULE (e.g. FREQ=WEEKLY;BYDAY=TU,TH)"
                                            value={(currentItem as AppEvent).rrule || ""}
                                            disabled={isReadOnlyCalendar}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                updateEvent(currentItem.id, {
                                                    rrule:
                                                        e.target.value ||
                                                        undefined,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div
                                    className="inspector-field"
                                    style={{
                                        gap: "20px",
                                        padding: "8px 0",
                                        flexDirection: "row",
                                    }}
                                >
                                    <Toggle
                                        label="End date"
                                        checked={!!showEndDate}
                                        disabled={isReadOnlyCalendar}
                                        onChange={(checked: boolean) => {
                                            if (isReadOnlyCalendar) return;
                                            setShowEndDate(checked);
                                            if (!checked)
                                                updateEvent(currentItem.id, {
                                                    endDate: (currentItem as AppEvent).date,
                                                });
                                        }}
                                    />
                                    <Toggle
                                        label="Include time"
                                        checked={!(currentItem as AppEvent).isAllDay}
                                        disabled={isReadOnlyCalendar}
                                        onChange={(checked: boolean) => {
                                            if (isReadOnlyCalendar) return;
                                            const updates: Partial<AppEvent> = {
                                                isAllDay: !checked,
                                            };
                                            if ((currentItem as AppEvent).type !== "plan")
                                                updates.type = !checked
                                                    ? "busy"
                                                    : "info";
                                            updateEvent(
                                                currentItem.id,
                                                updates,
                                            );
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "16px",
                                        marginTop: "16px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            flex: 1,
                                        }}
                                    >
                                        <input
                                            type="date"
                                            className="inspector-date-input"
                                            value={String((currentItem as AppEvent).date)}
                                            disabled={isReadOnlyCalendar}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                updateEvent(currentItem.id, {
                                                    date: e.target.value,
                                                })
                                            }
                                        />
                                        {!(currentItem as AppEvent).isAllDay && (
                                            <input
                                                type="time"
                                                className="inspector-date-input"
                                                value={minToTime(Number((currentItem as AppEvent).start))}
                                                disabled={isReadOnlyCalendar}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    updateEvent(
                                                        currentItem.id,
                                                        {
                                                            start: timeToMin(
                                                                e.target.value,
                                                            ),
                                                        },
                                                    )
                                                }
                                            />
                                        )}
                                    </div>

                                    {showEndDate && (
                                        <div
                                            style={{
                                                color: "var(--fg-dim)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <span className="material-symbols-outlined">
                                                arrow_forward
                                            </span>
                                        </div>
                                    )}

                                    {showEndDate && (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "8px",
                                                flex: 1,
                                            }}
                                        >
                                            <input
                                                type="date"
                                                className="inspector-date-input"
                                                value={String((currentItem as AppEvent).endDate || (currentItem as AppEvent).date)}
                                                min={String((currentItem as AppEvent).date)}
                                                disabled={isReadOnlyCalendar}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    updateEvent(
                                                        currentItem.id,
                                                        {
                                                            endDate:
                                                                e.target.value,
                                                        },
                                                    )
                                                }
                                            />
                                            {!(currentItem as AppEvent).isAllDay && (
                                                <input
                                                    type="time"
                                                    className="inspector-date-input"
                                                    value={minToTime(
                                                        (currentItem as AppEvent).end,
                                                    )}
                                                    disabled={isReadOnlyCalendar}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        updateEvent(
                                                            currentItem.id,
                                                            {
                                                                end: timeToMin(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            },
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </React.Fragment>
            )}
        </div>
    );
}
