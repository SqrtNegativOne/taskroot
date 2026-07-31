import React from "react";
import type { AppEvent, AppTask } from "../../core/domain/models";
import type { CalendarData } from "../../core/store/repositories";
import { TitleInput, DescriptionInput } from "../inputs";
import { TaskInspector } from "./inspector-task";
import { EventInspector } from "./inspector-event";
import { InspectorPaneHeader } from "./inspector-shared";

export interface InspectorPaneContentProps {
    currentItem: AppTask | AppEvent;
    currentTask?: AppTask;
    currentEvent?: AppEvent;
    isReadOnlyCalendar: boolean;
    title?: string;
    tasks: AppTask[];
    calendars: CalendarData[];
    onPaneClose: () => void;
    onPaneDelete: () => void;
    handleTitleChange: (t: string) => void;
    handleDescChange: (d: string) => void;
    updateTask: (id: string, updates: Partial<AppTask>) => void;
    updateEvent: (id: string, updates: Partial<AppEvent>) => void;
    isNew: boolean;
}

export function InspectorPaneContent({
    currentItem,
    currentTask,
    currentEvent,
    isReadOnlyCalendar,
    title,
    tasks,
    calendars,
    onPaneClose,
    onPaneDelete,
    handleTitleChange,
    handleDescChange,
    updateTask,
    updateEvent,
    isNew,
}: InspectorPaneContentProps) {
    return (
        <React.Fragment key={currentItem.id}>
            <InspectorPaneHeader handleClose={onPaneClose} handleDelete={onPaneDelete} isReadOnlyCalendar={isReadOnlyCalendar} />
            <div className="inspector-body" style={{ paddingTop: 0 }}>
                <div
                    className="inspector-field"
                    style={{ marginTop: "24px", marginBottom: "4px" }}
                >
                    <TitleInput
                        value={title || ""}
                        onChange={handleTitleChange}
                        disabled={Boolean(currentEvent?.taskId) || isReadOnlyCalendar}
                        onEnter={onPaneClose}
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
                        autoFocus={isNew}
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
                        value={(currentEvent?.description) || ""}
                        onChange={handleDescChange}
                        disabled={isReadOnlyCalendar}
                    />
                </div>

                {isReadOnlyCalendar && (
                    <div className="inspector-field" style={{color: "var(--tag-red)", fontSize: "0.85em", marginTop: "8px"}}>
                        This event belongs to a read-only calendar and cannot be modified.
                    </div>
                )}

                {currentTask ? (
                    <TaskInspector 
                        task={currentTask} 
                        updateTask={updateTask} 
                    />
                ) : currentEvent ? (
                    <EventInspector 
                        event={currentEvent} 
                        tasks={tasks}
                        calendars={calendars}
                        updateEvent={updateEvent}
                        isReadOnlyCalendar={isReadOnlyCalendar}
                    />
                ) : undefined}
            </div>
        </React.Fragment>
    );
}
