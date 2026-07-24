import React from "react";
import type { AppTask, AppEvent } from "../core/domain/models";
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
                            <div
                                key={s}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(s);
                                }}
                                className="tag-suggestion"
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
            }}
            onClick={() => onChange(!checked)}
        >
            <div className={`toggle-switch ${checked ? "is-on" : ""}`}>
                <div className="toggle-switch-thumb" />
            </div>
            <span style={{ fontSize: "0.9em" }}>{label}</span>
        </div>
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
            <div
                onClick={() => setEditing(true)}
                style={{
                    minHeight: "24px",
                    cursor: "text",
                    padding: "0",
                    color: value ? "var(--fg)" : "var(--fg-dim)",
                    borderRadius: "4px",
                }}
            >
                {value || "Add description..."}
            </div>
        );
    }

    return (
        <textarea
            autoFocus
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
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "20px" }}
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
                                disabled={Boolean(!isCurrentTask && (currentItem as AppEvent).taskId)}
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
                                autoFocus={Boolean((currentItem as AppTask).isDraft)}
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

                        {isCurrentTask && (
                            <>
                                <div className="inspector-row">
                                    <div className="inspector-field">
                                        <label>Status</label>
                                        <select
                                            value={(currentItem as AppTask).status}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                updateTask(currentItem.id, {
                                                    status: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="todo">todo</option>
                                            <option value="next-up">
                                                next up
                                            </option>
                                            <option value="doing">doing</option>
                                            <option value="done">done</option>
                                        </select>
                                    </div>
                                    <div className="inspector-field">
                                        <label>Priority</label>
                                        <input
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
                                    <label>Duration (min)</label>
                                    <input
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
                                    <label>Calendar</label>
                                    <select
                                        value={
                                            (currentItem as AppEvent).googleCalendarId ||
                                            "primary"
                                        }
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
                                        {calendars.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.summary}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div
                                    className="inspector-field"
                                    style={{ marginTop: "8px" }}
                                >
                                    <label>Repeat (RRULE)</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                            width: "100%",
                                        }}
                                    >
                                        <select
                                            value={(currentItem as AppEvent).rrule || ""}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                updateEvent(currentItem.id, {
                                                    rrule:
                                                        e.target.value ||
                                                        undefined,
                                                })
                                            }
                                        >
                                            <option value="">None</option>
                                            <option value="FREQ=DAILY">
                                                Daily
                                            </option>
                                            <option value="FREQ=WEEKLY">
                                                Weekly
                                            </option>
                                            <option value="FREQ=MONTHLY">
                                                Monthly
                                            </option>
                                            <option value="FREQ=YEARLY">
                                                Yearly
                                            </option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Custom RRULE (e.g. FREQ=WEEKLY;BYDAY=TU,TH)"
                                            value={(currentItem as AppEvent).rrule || ""}
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
                                        onChange={(checked: boolean) => {
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
                                        onChange={(checked: boolean) => {
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
