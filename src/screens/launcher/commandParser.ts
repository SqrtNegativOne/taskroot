import type { AppTask, AppEvent } from '../../core/domain/models';
import { toFloatingIso } from '../../core/utils/date-utils';

const MAX_EVENTS_TO_SHOW = 10;
const HH_MM_LENGTH = 5;

export interface CommandOption {
    id: string;
    label: string;
    action: string;
    payload?: Record<string, string>;
    static?: boolean;
}

type CommandHandler = (arg: string, tasks: AppTask[], events: AppEvent[]) => CommandOption[];

const commandHandlers: Record<string, CommandHandler> = {
    plan: (arg, tasks, events) => {
        if (!arg) return [];
        const cmds: CommandOption[] = [{
            id: `plan-task-new`,
            label: `Plan new task: ${arg}`,
            action: 'PLAN_TASK',
            payload: { taskName: arg }
        }];

        tasks.filter(t => t.title.toLowerCase().includes(arg)).forEach(t => {
            cmds.push({
                id: `plan-task-${t.id}`,
                label: `Plan existing task: ${t.title}`,
                action: 'PLAN_TASK_EXISTING',
                payload: { taskId: t.id }
            });
        });
        
        events.filter(e => e.title.toLowerCase().includes(arg)).forEach(e => {
            cmds.push({
                id: `plan-event-exist-${e.id}`,
                label: `Event already exists: ${e.title}`,
                action: 'DO_NOTHING',
            });
        });

        return cmds;
    },

    do: (arg, tasks, events) => {
        if (!arg) return [];
        const cmds: CommandOption[] = [{
            id: `do-task-new`,
            label: `Do new task: ${arg}`,
            action: 'DO_TASK',
            payload: { taskName: arg }
        }];

        tasks.filter(t => t.title.toLowerCase().includes(arg)).forEach(t => {
            cmds.push({
                id: `do-task-${t.id}`,
                label: `Do existing task: ${t.title}`,
                action: 'DO_TASK_EXISTING',
                payload: { taskId: t.id }
            });
        });

        events.filter(e => e.title.toLowerCase().includes(arg)).forEach(e => {
            cmds.push({
                id: `do-event-exist-${e.id}`,
                label: `Event already exists: ${e.title}`,
                action: 'DO_NOTHING',
            });
        });

        return cmds;
    },

    add: (arg, tasks, events) => {
        if (!arg) return [];
        const cmds: CommandOption[] = [{
            id: `add-task-new`,
            label: `Add new task: ${arg}`,
            action: 'ADD_TASK',
            payload: { taskName: arg }
        }];
        
        tasks.filter(t => t.title.toLowerCase().includes(arg)).forEach(t => {
            cmds.push({
                id: `add-task-exist-${t.id}`,
                label: `Task already exists: ${t.title}`,
                action: 'DO_NOTHING',
            });
        });
        
        events.filter(e => e.title.toLowerCase().includes(arg)).forEach(e => {
            cmds.push({
                id: `add-event-exist-${e.id}`,
                label: `Event already exists: ${e.title}`,
                action: 'DO_NOTHING',
            });
        });

        return cmds;
    },

    sked: (_arg, _tasks, events) => {
        const cmds: CommandOption[] = [];
        const nowIso = toFloatingIso(new Date());
        
        const upcoming = events
            .filter(e => e.endTime >= nowIso)
            .toSorted((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, MAX_EVENTS_TO_SHOW);
            
        upcoming.forEach(e => {
            const timeStr = e.startTime.includes('T') ? e.startTime.split('T')[1]?.substring(0, HH_MM_LENGTH) : 'All day';
            cmds.push({
                id: `sked-event-${e.id}`,
                label: `[${timeStr}] ${e.title}`,
                action: 'DO_NOTHING'
            });
        });
        
        if (upcoming.length === 0) {
            cmds.push({
                id: 'sked-none',
                label: 'No upcoming events',
                action: 'DO_NOTHING'
            });
        }
        
        return cmds;
    }
};

export function parseCommands(
    query: string,
    tasks: AppTask[],
    events: AppEvent[] = []
): CommandOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const [cmd, ...rest] = q.split(' ');
    if (!cmd) return [];
    const arg = rest.join(' ');

    const handler = commandHandlers[cmd];
    return handler ? handler(arg, tasks, events) : [];
}
