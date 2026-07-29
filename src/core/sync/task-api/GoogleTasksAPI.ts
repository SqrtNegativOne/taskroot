import { HTTP_UNAUTHORIZED } from "../../utils/constants";
import { fetchWithTimeout } from "../../store/api";
import type { AppTask } from "../../domain/models";
import type { IAuthManager } from "../auth/types";
import type { ITasksAPI } from "./types";

export const MAX_RETRIES = 3;

/// <reference types="gapi.client.tasks" />

function extractLocalTaskId(googleTask: gapi.client.tasks.Task, existing?: AppTask): string {
    return existing?.id || (googleTask.notes || "").match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/)?.[1] || googleTask.id || "";
}

function parseGoogleTaskDue(dueStr?: string): import("../../domain/models").DateString | undefined {
    const p = dueStr?.split("T")[0].split("-");
    if (p?.length === MAX_RETRIES) {
        return `${Number(p[0])}-${Number(p[1])}-${Number(p[2])}`;
    }
    return undefined;
}

function getGoogleTaskBase(googleTask: gapi.client.tasks.Task) {
    return {
        googleTaskId: googleTask.id || "",
        title: googleTask.title || "",
        notes: googleTask.notes || "",
        status: googleTask.status === "completed" ? "done" as const : "todo" as const,
        updatedAt: googleTask.updated ? new Date(googleTask.updated).getTime() : Date.now(),
    };
}

export class GoogleTasksAPI implements ITasksAPI {
    private authManager: IAuthManager;
    constructor(authManager: IAuthManager) {
        this.authManager = authManager;
    }

    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        const getOpts = (t: string) => ({ ...options, headers: { ...options.headers, Authorization: `Bearer ${t}` } });
        const token = this.authManager.getToken();
        if (!token) throw new Error("Unauthorized");
        let res = await fetchWithTimeout(`https://tasks.googleapis.com/tasks/v1/${endpoint}`, getOpts(token));
        if (res.status === HTTP_UNAUTHORIZED) {
            if (!await this.authManager.refreshAccessToken()) throw new Error("Unauthorized");
            res = await fetchWithTimeout(`https://tasks.googleapis.com/tasks/v1/${endpoint}`, getOpts(this.authManager.getToken() || ""));
        }
        return res;
    }

    async fetchTasks(tasklistId = "@default") {
        const allTasks: gapi.client.tasks.Task[] = [];
        let pageToken = "";
        do {
            const res = await this.fetchWithAuth(`lists/${tasklistId}/tasks?showCompleted=true&showHidden=true&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
            if (!res.ok) { console.warn(`Failed to fetch google tasks`); return undefined; }
            const data: { items?: gapi.client.tasks.Task[], nextPageToken?: string } = await res.json();
            if (data.items) allTasks.push(...data.items);
            pageToken = data.nextPageToken || "";
        } while (pageToken);
        return allTasks;
    }

    async createTask(localTask: AppTask, tasklistId = "@default") {
        const res = await this.fetchWithAuth(`lists/${tasklistId}/tasks`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleTask(localTask))
        });
        if (!res.ok) throw new Error(`Failed to create task: ${res.status} ${await res.text()}`);
        const data: gapi.client.tasks.Task = await res.json();
        return data.id || "";
    }

    async updateTask(googleTaskId: string, localTask: AppTask, tasklistId = "@default") {
        const res = await this.fetchWithAuth(`lists/${tasklistId}/tasks/${googleTaskId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.toGoogleTask(localTask))
        });
        if (!res.ok) throw new Error(`Failed to update task: ${res.status} ${await res.text()}`);
    }

    async deleteTask(googleTaskId: string, tasklistId = "@default") {
        const res = await this.fetchWithAuth(`lists/${tasklistId}/tasks/${googleTaskId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Failed to delete task: ${res.status} ${await res.text()}`);
    }

    toLocalTask(googleTask: gapi.client.tasks.Task, existing: AppTask | undefined = undefined): AppTask | { id: string; _deleted: boolean; updatedAt: number; } {
        if (googleTask.deleted) {
            return { id: existing?.id || googleTask.id || "", _deleted: true, updatedAt: new Date(googleTask.updated || 0).getTime() };
        }

        const id = extractLocalTaskId(googleTask, existing);
        const due = parseGoogleTaskDue(googleTask.due);
        const base = getGoogleTaskBase(googleTask);

        if (existing) return { ...existing, ...base, due: due || existing.due };
        return {
            id, ...base, priority: 1, tags: [], subtasks: [], parent_task: null, est: 0,
            added: new Date().toISOString(), isDraft: false, due,
        };
    }

    toGoogleTask(localTask: AppTask): gapi.client.tasks.Task {
        return {
            title: localTask.title,
            notes: localTask.notes?.includes(`Taskroot Task ID: ${localTask.id}`) ? localTask.notes : `Taskroot Task ID: ${localTask.id}\n${localTask.notes || ""}`,
            status: localTask.status === "done" ? "completed" : "needsAction",
            ...(localTask.due ? { due: new Date(localTask.due).toISOString() } : {})
        };
    }
}
