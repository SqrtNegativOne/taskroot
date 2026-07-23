import { fetchWithTimeout } from "../store/api";
import { tokenBouncer } from "../auth/TokenBouncer";

export class GoogleTasksAPI {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async fetchWithAuth(url: string, options: any = {}) {
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
        const allTasks: any[] = [];
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

    async createTask(localTask: any, tasklistId = "@default") {
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
        localTask: any,
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

    toLocalTask(googleTask: any, existingLocalTask: any = null) {
        if (googleTask.deleted) {
            let id = googleTask.id;
            if (existingLocalTask) id = existingLocalTask.id;
            return {
                id,
                _deleted: true,
                updatedAt: new Date(googleTask.updated || 0).getTime(),
            };
        }
        let localStatus = "todo";
        if (googleTask.status === "completed") {
            localStatus = "done";
        }

        let id = googleTask.id;
        const match = (googleTask.notes || "").match(
            /Taskroot Task ID: (t[0-9a-zA-Z-]+)/,
        );
        if (match) {
            id = match[1];
        }

        if (existingLocalTask) {
            id = existingLocalTask.id;
        }

        const defaultTask = {
            id,
            googleTaskId: googleTask.id,
            title: googleTask.title || "",
            status: localStatus,
            priority: 1,
            tags: [],
            subtasks: [],
            parent_task: null,
            dependency: null,
            est: 0,
            added: new Date().toISOString(),
            isDraft: false,
            notes: googleTask.notes || "",
            due: googleTask.due ? googleTask.due.split("T")[0] : undefined,
            updatedAt: googleTask.updated
                ? new Date(googleTask.updated).getTime()
                : Date.now(),
        };

        if (existingLocalTask) {
            return {
                ...existingLocalTask,
                googleTaskId: googleTask.id,
                title: googleTask.title || "",
                status: localStatus,
                notes: googleTask.notes || "",
                due: googleTask.due
                    ? googleTask.due.split("T")[0]
                    : existingLocalTask.due,
                updatedAt: googleTask.updated
                    ? new Date(googleTask.updated).getTime()
                    : Date.now(),
            };
        }

        return defaultTask;
    }

    toGoogleTask(localTask: any) {
        let notes = localTask.notes || "";
        if (!notes.includes(`Taskroot Task ID: ${localTask.id}`)) {
            notes = `Taskroot Task ID: ${localTask.id}\n${notes}`;
        }
        const result: any = {
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

export const googleTasksAPI = new GoogleTasksAPI();
