import {
    useState,
    useEffect,
} from "react";
import { Collapsible } from "../../components/collapsible";
import { DistractionLog } from "./distraction-log";
import { Kanban } from "./kanban";
import { TitleBar } from "../../components/shell";
import { Stopwatch } from "./stopwatch";
import { useDistractions, useTasks, useNotes, useTips } from "../../core/store/hooks";

import { TipsList, NotesList } from "./tips-notes";
import { RestScreen } from "./RestScreen";

// Do screen — hero stopwatch + collapsible sections.

export function DoScreen() {

    const [isBreak, setIsBreak] = useState(false);
    const [showRestOverride, setShowRestOverride] = useState(false);

    useEffect(() => {
        if (isBreak) {
            setShowRestOverride(true);
        } else {
            setShowRestOverride(false);
        }
    }, [isBreak]);

    return (
        <div className="app app-do">
            <TitleBar current="do" />

            <main className="do-main">
                <Stopwatch onBreakStatusChange={setIsBreak} />

                {showRestOverride ? (
                    <div className="do-rest-container">
                        <div style={{ textAlign: "center", margin: "16px 0" }}>
                            <button
                                onClick={() => setShowRestOverride(false)}
                                className="sw-btn"
                                style={{
                                    padding: "6px 14px",
                                    fontSize: "13px",
                                }}
                            >
                                Back to Do
                            </button>
                        </div>
                        <RestScreen />
                    </div>
                ) : (
                    <div className="do-sections">
                        {isBreak && (
                            <div
                                style={{
                                    textAlign: "center",
                                    marginBottom: "16px",
                                }}
                            >
                                <button
                                    onClick={() => setShowRestOverride(true)}
                                    className="sw-btn"
                                    style={{
                                        padding: "6px 14px",
                                        fontSize: "13px",
                                    }}
                                >
                                    Go to Rest Screen
                                </button>
                            </div>
                        )}
                        <Collapsible
                            title="distraction log"
                            defaultOpen={true}
                            badge={<DistractionBadge />}
                        >
                            <DistractionLog />
                        </Collapsible>

                        <Collapsible
                            title="current tasks"
                            defaultOpen={false}
                            badge={<KanbanBadge />}
                        >
                            <Kanban />
                        </Collapsible>

                        <Collapsible
                            title="tips"
                            defaultOpen={false}
                            badge={<TipsBadge />}
                        >
                            <TipsList />
                        </Collapsible>

                        <Collapsible
                            title="notes"
                            defaultOpen={false}
                            badge={<NotesBadge />}
                        >
                            <NotesList />
                        </Collapsible>
                    </div>
                )}
            </main>
        </div>
    );
}

function DistractionBadge() {
    const [rows] = useDistractions();
    return (
        <span className="badge-count">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
    );
}
function KanbanBadge() {
    const [tasks] = useTasks();
    const active = tasks.filter((t) => t.status === "doing").length;
    return (
        <span className="badge-count">
            {tasks.length} tasks · {active} active
        </span>
    );
}
function TipsBadge() {
    const [tips] = useTips();
    return (
        <span className="badge-count">
            {tips.length} {tips.length === 1 ? "tip" : "tips"}
        </span>
    );
}
function NotesBadge() {
    const [notes] = useNotes();
    return (
        <span className="badge-count">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
    );
}
