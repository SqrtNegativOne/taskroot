import { ConflictError } from "../errors";
import type { AppTask } from "../../domain/models";
import type { ITasksAPI } from "./types";

/// <reference types="gapi.client.tasks" />

function extractLocalTaskId(googleTask: gapi.client.tasks.Task, existing?: AppTask): string {
    const id = existing?.id || googleTask.notes?.match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/)?.[1] || googleTask.id;
    if (!id) throw new Error("Google task missing ID");
    return id;
}

function parseGoogleTaskDue(dueStr?: string): import("../../domain/models").YmdString | undefined {
    const p = dueStr?.split("T")[0].split("-");
    /* eslint-disable-next-line no-magic-numbers */
    if (p?.length !== 3) return undefined;
    // We use type assertion to tell TypeScript this string matches the YmdString template literal
    // oxlint-disable-next-line typescript/consistent-type-assertions
    return `${Number(p[0])}-${Number(p[1])}-${Number(p[2])}` as import("../../domain/models").YmdString;
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

    private generateEtag(): string {
        return crypto.randomUUID();
    }

    async fetchTasks(tasklistId = "@default"): Promise<gapi.client.tasks.Task[] | undefined> {
        return this.tasks[tasklistId] || [];
    }

    async createTask(localTask: AppTask, tasklistId = "@default"): Promise<string> {
        if (!this.tasks[tasklistId]) this.tasks[tasklistId] = [];
        const remoteId = "fake-g-id-" + crypto.randomUUID();
        const googleTask = this.toGoogleTask(localTask);
        googleTask.id = remoteId;
        googleTask.etag = this.generateEtag();
        googleTask.updated = new Date().toISOString();
        this.tasks[tasklistId].push(googleTask);
        return remoteId;
    }

    async updateTask(remoteId: string, localTask: AppTask, _updatedFields?: (keyof AppTask)[], tasklistId = "@default"): Promise<void> {
        if (!this.tasks[tasklistId]) this.tasks[tasklistId] = [];
        const index = this.tasks[tasklistId].findIndex(t => t.id === remoteId);
        if (index === -1) throw new Error("Task not found");
        
        const existingTask = this.tasks[tasklistId][index];
        if (localTask.etag && existingTask.etag !== localTask.etag) {
            throw new ConflictError(`ETag conflict on task: ${localTask.title}`);
        }
        
        const updatedTask = this.toGoogleTask(localTask);
        updatedTask.id = remoteId;
        updatedTask.etag = this.generateEtag();
        updatedTask.updated = new Date().toISOString();
        this.tasks[tasklistId][index] = updatedTask;
    }

    async deleteTask(remoteId: string, tasklistId = "@default"): Promise<void> {
        if (!this.tasks[tasklistId]) return;
        const index = this.tasks[tasklistId].findIndex(t => t.id === remoteId);
        if (index !== -1) {
            this.tasks[tasklistId][index].deleted = true;
            this.tasks[tasklistId][index].etag = this.generateEtag();
            this.tasks[tasklistId][index].updated = new Date().toISOString();
        }
    }

    toLocalTask(googleTask: gapi.client.tasks.Task, existing: AppTask | undefined = undefined): AppTask | { id: string; _deleted: boolean; updatedAt: number; } {
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
