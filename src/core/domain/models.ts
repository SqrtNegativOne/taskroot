export interface AppTask {
  id: string;
  title: string;
  status?: 'todo' | 'next-up' | 'doing' | 'done' | string;
  priority?: number | string;
  tags?: string[];
  subtasks?: { done: boolean; [key: string]: unknown }[];
  parent_task?: string | null;
  dependencies?: string[];
  est?: number;
  added?: string;
  isDraft?: boolean;
  canvasX?: number;
  canvasY?: number;
  onCanvas?: boolean;
  [key: string]: unknown;
}

export interface AppFilter {
  id?: string;
  column: string;
  operator: string;
  value: string | number;
}
