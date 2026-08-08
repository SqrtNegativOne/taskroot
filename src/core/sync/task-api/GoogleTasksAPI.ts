import { HTTP_PRECONDITION_FAILED } from "../../utils/constants";
import { fetchWithRateLimitAndAuth } from "../google-api-utils";
import { ConflictError } from "../errors";
import type { AppTask } from "../../domain/models";
import type { IAuthManager } from "../auth/types";
import type { ITasksAPI } from "./types";
import { parseSigils } from "../../utils/sigil-parser";

export const MAX_RETRIES = 3;

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

function mergeGoogleTaskWithExisting(existing: AppTask, newBase: Partial<AppTask>, properties: import("../../utils/sigil-parser").ParsedProperties, due: string | undefined): AppTask {
    const status = existing.status === "doing" && newBase.status === "todo" ? "doing" : newBase.status;
    return { 
        ...existing, 
        ...newBase, 
        status, 
        due: due || existing.due,
        priority: properties.priority ?? existing.priority,
        tags: properties.tags ? Array.from(new Set([...(existing.tags || []), ...properties.tags])) : existing.tags,
        est: properties.duration ?? existing.est,
    };
}

function buildPartialTaskPayload(updatedFields: (keyof AppTask)[], fullPayload: gapi.client.tasks.Task) {
    const partialPayload: Partial<gapi.client.tasks.Task> = {};
    const hasTitleUpdate = updatedFields.includes("title");
    const titleVal = fullPayload.title;
    const hasTitle = titleVal !== undefined;
    if (hasTitleUpdate && hasTitle) partialPayload.title = titleVal;

    const hasNotesUpdate = updatedFields.includes("notes");
    const notesVal = fullPayload.notes;
    const hasNotes = notesVal !== undefined;
    if (hasNotesUpdate && hasNotes) partialPayload.notes = notesVal;

    const hasStatusUpdate = updatedFields.includes("status");
    const statusVal = fullPayload.status;
    const hasStatus = statusVal !== undefined;
    if (hasStatusUpdate && hasStatus) partialPayload.status = statusVal;

    const hasDueUpdate = updatedFields.includes("due");
    const dueVal = fullPayload.due;
    const hasDue = dueVal !== undefined;
    if (hasDueUpdate && hasDue) partialPayload.due = dueVal;

    return partialPayload;
}

export class GoogleTasksAPI implements ITasksAPI {
    private authManager: IAuthManager;
    constructor(authManager: IAuthManager) {
        this.authManager = authManager;
    }

    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        return fetchWithRateLimitAndAuth(`https://tasks.googleapis.com/tasks/v1/${endpoint}`, this.authManager, options);
    }

    async fetchTasks(tasklistId = "@default", pageToken = "", accumulated: gapi.client.tasks.Task[] = []): Promise<gapi.client.tasks.Task[] | undefined> {
        const result = await this.fetchWithAuth(`lists/${tasklistId}/tasks?showCompleted=true&showHidden=true&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
        if (result.isErr()) throw result.error;
        const res = result.value;
        if (!res.ok) { console.warn(`Failed to fetch google tasks`); return undefined; }
        const data: gapi.client.tasks.Tasks = await res.json();
        if (data.items) accumulated.push(...data.items);
        
        if (data.nextPageToken) {
            return this.fetchTasks(tasklistId, data.nextPageToken, accumulated);
        }
        return accumulated;
    }

    async createTask(localTask: AppTask, tasklistId = "@default") {
        const result = await this.fetchWithAuth(`lists/${tasklistId}/tasks`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleTask(localTask))
        });
        if (result.isErr()) throw result.error;
        const res = result.value;
        if (!res.ok) throw new Error(`Failed to create task: ${res.status} ${await res.text()}`);
        const data: gapi.client.tasks.Task = await res.json();
        if (!data.id) throw new Error("Task created but no ID returned");
        return data.id;
    }

    async updateTask(remoteId: string, localTask: AppTask, updatedFields?: (keyof AppTask)[], tasklistId = "@default") {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (localTask.etag) headers["If-Match"] = localTask.etag;

        const fullPayload = this.toGoogleTask(localTask);
        const hasUpdates = updatedFields && updatedFields.length > 0;
        const payloadToSubmit = hasUpdates ? buildPartialTaskPayload(updatedFields, fullPayload) : fullPayload;

        const result = await this.fetchWithAuth(`lists/${tasklistId}/tasks/${remoteId}`, {
            method: "PATCH", headers, body: JSON.stringify(payloadToSubmit)
        });
        if (result.isErr()) throw result.error;
        const res = result.value;
        
        if (res.status === HTTP_PRECONDITION_FAILED) throw new ConflictError(`ETag conflict on task: ${localTask.title}`);
        if (!res.ok) throw new Error(`Failed to update task: ${res.status} ${await res.text()}`);
    }

    async deleteTask(remoteId: string, tasklistId = "@default") {
        const result = await this.fetchWithAuth(`lists/${tasklistId}/tasks/${remoteId}`, { method: "DELETE" });
        if (result.isErr()) throw result.error;
        const res = result.value;
        if (!res.ok) throw new Error(`Failed to delete task: ${res.status} ${await res.text()}`);
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

        const { cleanTitle, properties } = parseSigils(base.title);
        const hasSigils = cleanTitle !== base.title;

        // If sigils were found, we bump updatedAt so it pushes the cleanTitle back to Google Tasks
        const updatedAt = hasSigils ? Date.now() : base.updatedAt;

        const newBase = { ...base, title: cleanTitle, updatedAt };

        if (existing) {
            return mergeGoogleTaskWithExisting(existing, newBase, properties, due);
        }
        return {
            id, ...newBase, 
            priority: properties.priority ?? 1, 
            tags: properties.tags || [], 
            subtasks: [], parent_task: undefined, 
            est: properties.duration || 0,
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
