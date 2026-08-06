import type { AppTask } from "../../domain/models";
/// <reference types="gapi.client.tasks" />

export interface ITasksAPI {
    fetchTasks(tasklistId?: string): Promise<gapi.client.tasks.Task[] | undefined>;
    createTask(localTask: AppTask, tasklistId?: string): Promise<string>;
    updateTask(remoteId: string, localTask: AppTask, updatedFields?: (keyof AppTask)[], tasklistId?: string): Promise<void>;
    deleteTask(remoteId: string, tasklistId?: string): Promise<void>;
    toLocalTask(remoteTask: gapi.client.tasks.Task, existingLocalTask?: AppTask | undefined): AppTask | { id: string; _deleted: boolean; updatedAt: number; };
}
