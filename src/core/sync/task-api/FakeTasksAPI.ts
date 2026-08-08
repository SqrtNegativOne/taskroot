import { ConflictError } from "../errors";
import type { AppTask } from "../../domain/models";
import type { ITasksAPI } from "./types";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { type SyncError, UnknownError } from "../errors";

/// <reference types="gapi.client.tasks" />

function extractLocalTaskId(googleTask: gapi.client.tasks.Task, existing?: AppTask): string {
    const id = existing?.id || googleTask.notes?.match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/)?.[1] || googleTask.id;
    if (!id) throw new Error("Google task missing ID");
    return id;
}

function parseGoogleTaskDue(dueStr?: string): import("../../domain/models").YmdString | undefined {
    const t = dueStr?.split("T")[0];
    const p = t ? t.split("-") : undefined;
    const EXPECTED_DATE_PARTS = 3;
    if (p?.length !== EXPECTED_DATE_PARTS) return undefined;
    return `${Number(p[0])}-${Number(p[1])}-${Number(p[2])}`;
}

function getGoogleTaskBase(googleTask: gapi.client.tasks.Task) {
    if (!googleTask.id) throw new Error("Google task missing ID");
    return {
        remoteId: googleTask.id,
        title: googleTask.title ?? "",
        notes: googleTask.notes ?? "",
        status: googleTask.status === "completed" ? "done" as const : "todo" as const,
        updatedAt: googleTask.updated ? new Date(googleTask.updated).getTime() : Date.now(),
        etag: googleTask.etag,
    };
}

export class FakeTasksAPI implements ITasksAPI {
    private tasks: Record<string, gapi.client.tasks.Task[]> = {};

    public seedRemoteTasks(tasks: gapi.client.tasks.Task[], tasklistId = "@default"): void {
        this.tasks[tasklistId] = tasks;
    }

    private generateEtag(): string {
        return crypto.randomUUID();
    }

    fetchTasks(tasklistId = "@default"): ResultAsync<gapi.client.tasks.Task[] | undefined, SyncError> {
        return okAsync(this.tasks[tasklistId] || []);
    }

    createTask(localTask: AppTask, tasklistId = "@default"): ResultAsync<string, SyncError> {
        if (!this.tasks[tasklistId]) this.tasks[tasklistId] = [];
        const remoteId = "fake-g-id-" + crypto.randomUUID();
        const googleTask = this.toGoogleTask(localTask);
        googleTask.id = remoteId;
        googleTask.etag = this.generateEtag();
        googleTask.updated = new Date().toISOString();
        this.tasks[tasklistId].push(googleTask);
        return okAsync(remoteId);
    }

    updateTask(remoteId: string, localTask: AppTask, _updatedFields?: (keyof AppTask)[], tasklistId = "@default"): ResultAsync<void, SyncError> {
        if (!this.tasks[tasklistId]) this.tasks[tasklistId] = [];
        const index = this.tasks[tasklistId].findIndex(t => t.id === remoteId);
        if (index === -1) return errAsync(new UnknownError("Task not found"));
        
        const existingTask = this.tasks[tasklistId]?.[index];
        if (!existingTask) return errAsync(new UnknownError("Task not found"));
        if (localTask.etag && existingTask.etag !== localTask.etag) {
            return errAsync(new ConflictError(`ETag conflict on task: ${localTask.title}`));
        }
        
        const updatedTask = this.toGoogleTask(localTask);
        updatedTask.id = remoteId;
        updatedTask.etag = this.generateEtag();
        updatedTask.updated = new Date().toISOString();
        this.tasks[tasklistId][index] = updatedTask;
        return okAsync(undefined);
    }

    deleteTask(remoteId: string, tasklistId = "@default"): ResultAsync<void, SyncError> {
        if (!this.tasks[tasklistId]) return okAsync(undefined);
        const index = this.tasks[tasklistId].findIndex(t => t.id === remoteId);
        if (index !== -1) {
        const t = this.tasks[tasklistId]?.[index];
        if (t) {
            t.deleted = true;
            t.etag = this.generateEtag();
            t.updated = new Date().toISOString();
        }
        }
        return okAsync(undefined);
    }

    toLocalTask(googleTask: gapi.client.tasks.Task, existing?: AppTask): AppTask | { id: string; _deleted: boolean; updatedAt: number; } {
        if (googleTask.deleted) {
            const id = existing?.id || googleTask.id;
            if (!id) throw new Error("Deleted Google task missing ID");
            return { id, _deleted: true, updatedAt: googleTask.updated ? new Date(googleTask.updated).getTime() : 0 };
        }

        const id = extractLocalTaskId(googleTask, existing);
        const due = parseGoogleTaskDue(googleTask.due);
        const base = getGoogleTaskBase(googleTask);

        if (existing) {
            const status = existing.status === "doing" && base.status === "todo" ? "doing" : base.status;
            return { ...existing, ...base, status, due: due || existing.due };
        }
        return {
            id, ...base, priority: 1, tags: [], subtasks: [], parent_task: undefined, est: 0,
            added: new Date().toISOString(), isDraft: false, due,
        };
    }

    toGoogleTask(localTask: AppTask): gapi.client.tasks.Task {
        return {
            title: localTask.title,
            notes: localTask.notes?.includes(`Taskroot Task ID: ${localTask.id}`) ? localTask.notes : `Taskroot Task ID: ${localTask.id}\n${localTask.notes ?? ""}`,
            status: localTask.status === "done" ? "completed" : "needsAction",
            ...(localTask.due ? { due: new Date(localTask.due).toISOString() } : {})
        };
    }
}
