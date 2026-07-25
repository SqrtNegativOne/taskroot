import { fetchWithTimeout } from "../store/api";
import { tokenBouncer } from "../auth/TokenBouncer";
import type { AppTask } from "../domain/models";
/// <reference types="gapi.client.tasks" />

export class GoogleTasksAPI {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async fetchWithAuth(url: string, options: RequestInit = {}) {
        if (!this.token) throw new Error("Unauthorized");
        const getOptions = () => ({
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${this.token}`,
            }
        });

        let res = await fetchWithTimeout(url, getOptions());
        if (res.status === 401) {
            const refreshed = await tokenBouncer.refreshAccessToken();
            if (refreshed) {
                res = await fetchWithTimeout(url, getOptions());
            } else {
                throw new Error("Unauthorized");
            }
        }
        return res;
    }

    async fetchTasks(tasklistId = "@default") {
        const allTasks: gapi.client.tasks.Task[] = [];
        let pageToken: string | null = null;
        do {
            const url = new URL(
                `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks`,
            );
            url.searchParams.append("showCompleted", "true");
            url.searchParams.append("showHidden", "true");
            url.searchParams.append("maxResults", "100");
            if (pageToken) url.searchParams.append("pageToken", pageToken);

            const res = await this.fetchWithAuth(url.toString());
            if (!res.ok) {
                console.warn(`Failed to fetch google tasks`);
                return null;
            }
            const data = await res.json();
            if (data.items) allTasks.push(...data.items);
            pageToken = data.nextPageToken;
        } while (pageToken);

        return allTasks;
    }

    async createTask(localTask: AppTask, tasklistId = "@default") {
        const body = this.toGoogleTask(localTask);
        const res = await this.fetchWithAuth(
            `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            },
        );
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to create task: ${res.status} ${errText}`);
        }
        const data = await res.json();
        return data.id;
    }

    async updateTask(
        googleTaskId: string,
        localTask: AppTask,
        tasklistId = "@default",
    ) {
        const body = this.toGoogleTask(localTask);
        const res = await this.fetchWithAuth(
            `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            },
        );
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to update task: ${res.status} ${errText}`);
        }
    }

    async deleteTask(googleTaskId: string, tasklistId = "@default") {
        const res = await this.fetchWithAuth(
            `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`,
            {
                method: "DELETE",
            },
        );
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to delete task: ${res.status} ${errText}`);
        }
    }

    toLocalTask(googleTask: gapi.client.tasks.Task, existingLocalTask: AppTask | null = null): AppTask | { id: string; _deleted: boolean; updatedAt: number; } {
        if (googleTask.deleted) {
            let id = googleTask.id || "";
            if (existingLocalTask) id = existingLocalTask.id;
            return {
                id,
                _deleted: true,
                updatedAt: new Date(googleTask.updated || 0).getTime(),
            };
        }

        return createUpdatedLocalTask(googleTask, existingLocalTask);
    }

    toGoogleTask(localTask: AppTask): gapi.client.tasks.Task {
        let notes = localTask.notes || "";
        if (!notes.includes(`Taskroot Task ID: ${localTask.id}`)) {
            notes = `Taskroot Task ID: ${localTask.id}\n${notes}`;
        }
        const result: gapi.client.tasks.Task = {
            title: localTask.title,
            notes: notes,
            status: localTask.status === "done" ? "completed" : "needsAction",
        };
        if (localTask.due) {
            result.due = new Date(localTask.due).toISOString();
        }
        return result;
    }
}

const extractTaskId = (gTask: gapi.client.tasks.Task, existing: AppTask | null): string => {
    if (existing) return existing.id;
    const match = (gTask.notes || "").match(/Taskroot Task ID: (t[0-9a-zA-Z-]+)/);
    return match ? match[1] : (gTask.id || "");
};

const parseDueDate = (dueStr?: string): import("../domain/models").DateString | undefined => {
    if (!dueStr) return undefined;
    const parts = dueStr.split("T")[0].split("-");
    return parts.length === 3 ? `${Number(parts[0])}-${Number(parts[1])}-${Number(parts[2])}` : undefined;
};

function createUpdatedLocalTask(googleTask: gapi.client.tasks.Task, existingLocalTask: AppTask | null): AppTask {
    const id = extractTaskId(googleTask, existingLocalTask);
    const due = parseDueDate(googleTask.due);
    const updatedAt = googleTask.updated ? new Date(googleTask.updated).getTime() : Date.now();
    const status = googleTask.status === "completed" ? "done" : "todo";

    const baseTaskData = {
        googleTaskId: googleTask.id,
        title: googleTask.title || "",
        notes: googleTask.notes || "",
        status,
        updatedAt,
    };

    if (existingLocalTask) {
        return {
            ...existingLocalTask,
            ...baseTaskData,
            due: due || existingLocalTask.due,
        };
    }

    return {
        id,
        ...baseTaskData,
        priority: 1,
        tags: [],
        subtasks: [],
        parent_task: null,
        est: 0,
        added: new Date().toISOString(),
        isDraft: false,
        due,
    };
}

export const googleTasksAPI = new GoogleTasksAPI();
