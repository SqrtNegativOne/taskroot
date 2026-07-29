import type { AppTask } from "../../domain/models";
/// <reference types="gapi.client.tasks" />

export interface ITasksAPI {
    fetchTasks(tasklistId?: string): Promise<gapi.client.tasks.Task[] | undefined>;
    createTask(localTask: AppTask, tasklistId?: string): Promise<string>;
    updateTask(googleTaskId: string, localTask: AppTask, tasklistId?: string): Promise<void>;
    deleteTask(googleTaskId: string, tasklistId?: string): Promise<void>;
    toLocalTask(remoteTask: gapi.client.tasks.Task, existingLocalTask?: AppTask | undefined): AppTask | { id: string; _deleted: boolean; updatedAt: number; };
}
