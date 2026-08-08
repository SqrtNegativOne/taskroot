import type { AppTask } from "../../domain/models";
import { ResultAsync } from "neverthrow";
import type { SyncError } from "../errors";
/// <reference types="gapi.client.tasks" />

export interface ITasksAPI {
    fetchTasks(tasklistId?: string): ResultAsync<gapi.client.tasks.Task[] | undefined, SyncError>;
    createTask(localTask: AppTask, tasklistId?: string): ResultAsync<string, SyncError>;
    updateTask(remoteId: string, localTask: AppTask, updatedFields?: (keyof AppTask)[], tasklistId?: string): ResultAsync<void, SyncError>;
    deleteTask(remoteId: string, tasklistId?: string): ResultAsync<void, SyncError>;
    toLocalTask(remoteTask: gapi.client.tasks.Task, existingLocalTask?: AppTask  ): AppTask | { id: string; _deleted: boolean; updatedAt: number; };
}
