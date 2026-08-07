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
                        parseMode={true}
                        onPropertiesParsed={(props) => {
                            if (currentTask) {
                                const updates: Partial<AppTask> = {};
                                if (props.priority !== undefined) updates.priority = props.priority;
                                if (props.tags) updates.tags = [...(currentTask.tags || []), ...props.tags];
                                if (props.duration !== undefined) updates.est = props.duration;
                                if (props.day) {
                                    import('../../core/utils/sigil-parser').then(m => {
                                        const newDue = m.getDueDateFromSigil(props.day as string);
                                        updateTask(currentTask.id, { ...updates, due: newDue });
                                        return true;
                                    }).catch(() => false);
                                    return; // early return because we handle update asynchronously
                                }
                                if (Object.keys(updates).length > 0) updateTask(currentTask.id, updates);
                            } else if (currentEvent && !isReadOnlyCalendar) {
                                // For events, we could theoretically apply duration, day, time, but they aren't straight forward updates yet.
                                // We'll just strip the sigils for now, which TitleInput handles via onBlur and cleanTitle.
                                // If they want us to update startTime/endTime based on 'props.duration' or 'props.time' we can do it here later.
                            }
                        }}
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
