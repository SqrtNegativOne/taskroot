import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppTask, AppEvent } from "../../core/domain/models";
import { ymd } from "../../core/store/data";

interface TaskSelectorProps {
    selectorOpen: boolean;
    setSelectorOpen: (open: boolean) => void;
    tasks: AppTask[];
    events: AppEvent[];
    activeTask: AppTask | null | undefined;
    allowNoTask: boolean;
    startWithTask: (taskId: string) => void;
}

export function TaskSelector({
    selectorOpen,
    setSelectorOpen,
    tasks,
    events,
    activeTask,
    allowNoTask,
    startWithTask,
}: TaskSelectorProps) {
    const [visible, setVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [stagedTaskId, setStagedTaskId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectorOpen) {
            setVisible(true);
            setIsClosing(false);
            setStagedTaskId(null);
            setSearchQuery("");
        } else if (visible) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setIsClosing(false);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [selectorOpen, visible]);

    useEffect(() => {
        if (selectorOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [selectorOpen]);

    const sortedTasks = useMemo(() => {
        const todayStr = ymd(new Date());
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        let filtered = (tasks || []).filter(
            (t: AppTask) => t.status !== "done" && t.status !== "doing",
        );
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((t: AppTask) =>
                (t.title || "").toLowerCase().includes(q),
            );
        }

        const safeEvents = events || [];

        return [...filtered].sort((a: any, b: any) => {
            const aEvents = safeEvents.filter(
                (e: any) =>
                    e.taskId === a.id &&
                    (e.date === todayStr || e.endDate === todayStr),
            );
            const bEvents = safeEvents.filter(
                (e: any) =>
                    e.taskId === b.id &&
                    (e.date === todayStr || e.endDate === todayStr),
            );

            const aThisHour = aEvents.some(
                (e: any) =>
                    (e.start || 0) <= nowMin &&
                    ((e.end || 0) >= nowMin || (e.start || 0) + 60 >= nowMin),
            );
            const bThisHour = bEvents.some(
                (e: any) =>
                    (e.start || 0) <= nowMin &&
                    ((e.end || 0) >= nowMin || (e.start || 0) + 60 >= nowMin),
            );

            if (aThisHour !== bThisHour) return aThisHour ? -1 : 1;

            const aToday = aEvents.length > 0 || a.due === todayStr;
            const bToday = bEvents.length > 0 || b.due === todayStr;

            if (aToday !== bToday) return aToday ? -1 : 1;

            return (a.title || "").localeCompare(b.title || "");
        });
    }, [tasks, events, searchQuery]);

    if (!visible && !isClosing) return null;

    return (
        <>
            {!activeTask && !allowNoTask ? (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 90,
                        background: "rgba(0,0,0,0.5)",
                        backdropFilter: "blur(4px)",
                    }}
                />
            ) : (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 90,
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectorOpen(false);
                    }}
                />
            )}

            {(tasks || []).filter(
                (t: AppTask) => t.status !== "done" && t.status !== "doing",
            ).length === 0 ? (
                <div
                    className={`task-selector-overlay ${isClosing ? "is-closing" : "floating-menu"}`}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                    }}
                >
                    <div
                        style={{
                            color: "var(--fg-dim)",
                            fontSize: "24px",
                            pointerEvents: "auto",
                            textAlign: "center",
                        }}
                    >
                        Create some tasks to start working on them.
                    </div>
                </div>
            ) : (
                <div
                    className={`task-selector-overlay ${isClosing ? "is-closing" : "floating-menu"}`}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                    }}
                >
                    <style>{`
      .modern-task-input::placeholder {
        color: var(--fg-dim);
        opacity: 0.5;
      }
      .modern-task-item {
        cursor: pointer;
        font-size: 18px;
        color: var(--fg-dim);
        padding: 8px 16px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .modern-task-item:hover {
        color: var(--fg);
        transform: scale(1.05);
      }
      .modern-task-list::-webkit-scrollbar {
        display: none;
      }
    `}</style>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "800px",
                            pointerEvents: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <input
                            ref={searchInputRef}
                            className="modern-task-input"
                            style={{
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                width: "100%",
                                fontSize: "32px",
                                textAlign: "center",
                                fontWeight: 300,
                                color: stagedTaskId
                                    ? "var(--tag-gold)"
                                    : "var(--fg)",
                            }}
                            placeholder="Type a task"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (stagedTaskId) setStagedTaskId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    if (stagedTaskId) {
                                        startWithTask(stagedTaskId);
                                    } else if (sortedTasks.length > 0) {
                                        setStagedTaskId(sortedTasks[0].id);
                                        setSearchQuery(sortedTasks[0].title);
                                    }
                                } else if (e.key === "Escape") {
                                    if (stagedTaskId) {
                                        setStagedTaskId(null);
                                        setSearchQuery("");
                                        e.stopPropagation();
                                    }
                                }
                            }}
                        />

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "24px 0",
                                height: "1px",
                                width:
                                    stagedTaskId ||
                                    searchQuery.trim().length > 0
                                        ? "400px"
                                        : "100px",
                                transition:
                                    "width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease",
                                background: stagedTaskId
                                    ? "linear-gradient(90deg, transparent, var(--tag-gold), transparent)"
                                    : "linear-gradient(90deg, transparent, var(--fg-dim), transparent)",
                                position: "relative",
                            }}
                        >
                            <div
                                style={{
                                    width: "4px",
                                    height: "4px",
                                    borderRadius: "50%",
                                    background: stagedTaskId
                                        ? "var(--tag-gold)"
                                        : "var(--fg-dim)",
                                    position: "absolute",
                                    transition: "background 0.4s ease",
                                }}
                            />
                        </div>

                        <div
                            className="modern-task-list"
                            style={{
                                width: "100%",
                                maxHeight: "40vh",
                                overflowY: "auto",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                scrollbarWidth: "none",
                            }}
                        >
                            {stagedTaskId ? (
                                <button
                                    onClick={() => startWithTask(stagedTaskId)}
                                    style={{
                                        background: "transparent",
                                        border: "1px solid var(--tag-gold)",
                                        color: "var(--tag-gold)",
                                        fontSize: "16px",
                                        padding: "10px 32px",
                                        borderRadius: "32px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.1em",
                                        marginTop: "8px",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                            "var(--tag-gold)";
                                        e.currentTarget.style.color =
                                            "var(--bg)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                            "transparent";
                                        e.currentTarget.style.color =
                                            "var(--tag-gold)";
                                    }}
                                >
                                    Start working
                                </button>
                            ) : (
                                <TaskSearchResults
                                    sortedTasks={sortedTasks}
                                    setStagedTaskId={setStagedTaskId}
                                    setSearchQuery={setSearchQuery}
                                    searchInputRef={searchInputRef}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function TaskSearchResults({
    sortedTasks,
    setStagedTaskId,
    setSearchQuery,
    searchInputRef,
}: {
    sortedTasks: AppTask[];
    setStagedTaskId: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
    if (sortedTasks.length === 0) {
        return (
            <div
                style={{
                    color: "var(--fg-dim)",
                    fontSize: "16px",
                    marginTop: "16px",
                }}
            >
                No tasks match your search.
            </div>
        );
    }
    return (
        <>
            {sortedTasks.map((t) => (
                <button
                    type="button"
                    style={{ border: "none", background: "none", font: "inherit", color: "inherit", padding: 0, textAlign: "left", width: "100%", cursor: "pointer" }}
                    key={t.id}
                    className="modern-task-item"
                    onClick={() => {
                        setStagedTaskId(t.id);
                        setSearchQuery(t.title);
                        if (searchInputRef.current)
                            searchInputRef.current.focus();
                    }}
                >
                    {t.title}
                </button>
            ))}
        </>
    );
}
