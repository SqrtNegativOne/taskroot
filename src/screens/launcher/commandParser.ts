import { AppTask } from '../../core/domain/models';

export interface CommandOption {
    id: string;
    label: string;
    action: string;
    payload?: Record<string, string>;
    static?: boolean;
}

export function parseCommands(
    query: string,
    tasks: AppTask[]
): CommandOption[] {
    const q = query.trim().toLowerCase();

    // Command matching
    const [cmd, ...rest] = q.split(' ');
    const arg = rest.join(' ');

    const cmds: CommandOption[] = [];

    // "plan [taskname]" adds an event whose taskid is that task to today if it doesn't exist already.
    if (cmd === 'plan' && arg.length > 0) {
        cmds.push({
            id: `plan-task-new`,
            label: `Plan new task: ${arg}`,
            action: 'PLAN_TASK',
            payload: { taskName: arg }
        });

        tasks.filter(t => t.title.toLowerCase().includes(arg)).forEach(t => {
            cmds.push({
                id: `plan-task-${t.id}`,
                label: `Plan existing task: ${t.title}`,
                action: 'PLAN_TASK_EXISTING',
                payload: { taskId: t.id }
            });
        });
        return cmds;
    }

    // "do [taskname]" sets current task.
    if (cmd === 'do' && arg.length > 0) {
        cmds.push({
            id: `do-task-new`,
            label: `Do new task: ${arg}`,
            action: 'DO_TASK',
            payload: { taskName: arg }
        });

        tasks.filter(t => t.title.toLowerCase().includes(arg)).forEach(t => {
            cmds.push({
                id: `do-task-${t.id}`,
                label: `Do existing task: ${t.title}`,
                action: 'DO_TASK_EXISTING',
                payload: { taskId: t.id }
            });
        });
        return cmds;
    }

    // "add [taskname]" creates a task with that name.
    if (cmd === 'add' && arg.length > 0) {
        cmds.push({
            id: `add-task-new`,
            label: `Add new task: ${arg}`,
            action: 'ADD_TASK',
            payload: { taskName: arg }
        });
        return cmds;
    }

    // General matching across everything if no specific command syntax matches perfectly
    return [];
}
