import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings, useTasks, useEvents } from "../store/hooks";
import type { AppTask } from "../domain/models";
import { handleSettingsKeydown } from "./keybindings";
import { parseSigils, getDueDateFromSigil } from "./sigil-parser";

const launcherCommandHandlers: Record<string, (
    payload: Record<string, string> | undefined,
    navigate: ReturnType<typeof useNavigate>,
    setTasks: ReturnType<typeof useTasks>[1]
) => void> = {
    NAVIGATE: (payload, navigate) => {
        if (payload?.["route"]) void navigate(`/${payload["route"]}`);
    },
    RESET_MINITRACKER: () => {
        window.electronAPI?.resetMinitracker();
    },
    PLAN_TASK: (payload, navigate, setTasks) => {
        if (!payload?.["taskName"]) return;
        const { cleanTitle, properties } = parseSigils(payload["taskName"]);
        const newTask: AppTask = { 
            id: crypto.randomUUID(), 
            title: cleanTitle || "New Task", 
            status: 'todo',
            priority: properties.priority,
            tags: properties.tags,
            est: properties.duration,
            due: properties.day ? getDueDateFromSigil(properties.day) : undefined
        };
        setTasks((prev) => [newTask, ...prev]);
        void navigate('/plan');
    },
    PLAN_TASK_EXISTING: (_payload, navigate) => {
        void navigate('/plan');
    },
    DO_TASK: (payload, navigate, setTasks) => {
        if (!payload?.["taskName"]) return;
        const { cleanTitle, properties } = parseSigils(payload["taskName"]);
        const newTask: AppTask = { 
            id: crypto.randomUUID(), 
            title: cleanTitle || "New Task", 
            status: 'doing',
            priority: properties.priority,
            tags: properties.tags,
            est: properties.duration,
            due: properties.day ? getDueDateFromSigil(properties.day) : undefined
        };
        setTasks((prev) => [newTask, ...prev]);
        void navigate('/do');
    },
    DO_TASK_EXISTING: (payload, navigate, setTasks) => {
        if (!payload?.["taskId"]) return;
        setTasks((prev) => prev.map(t =>
            t.id === payload["taskId"] ? { ...t, status: 'doing' } : (t.status === 'doing' ? { ...t, status: 'todo' } : t)
        ));
        void navigate('/do');
    },
    ADD_TASK: (payload, _navigate, setTasks) => {
        if (!payload?.["taskName"]) return;
        const { cleanTitle, properties } = parseSigils(payload["taskName"]);
        const newTask: AppTask = { 
            id: crypto.randomUUID(), 
            title: cleanTitle || "New Task", 
            status: 'todo',
            priority: properties.priority,
            tags: properties.tags,
            est: properties.duration,
            due: properties.day ? getDueDateFromSigil(properties.day) : undefined
        };
        setTasks((prev) => [newTask, ...prev]);
    }
};

export function useAppIntegration() {
    const navigate = useNavigate();
    const [settings] = useSettings();
    const [tasks, setTasks] = useTasks();
    const [events] = useEvents();

    useEffect(() => {
        const api = window.electronAPI;
        if (api?.updateShortcut) {
            api.updateShortcut(settings.keybindingLauncher);
        }
    }, [settings.keybindingLauncher]);

    useEffect(() => {
        const api = window.electronAPI;
        if (api?.pushLauncherData) {
            api.pushLauncherData({ tasks, events });
        }
    }, [tasks, events]);

    useEffect(() => {
        const api = window.electronAPI;
        if (api?.onDeepLink) {
            api.onDeepLink((route: string) => {
                void navigate(`/${route}`);
            });
        }
    }, [navigate]);

    useEffect(() => {
        const api = window.electronAPI;
        if (api?.onLauncherCommand) {
            api.onLauncherCommand((cmdData: unknown) => {
                if (!cmdData || typeof cmdData !== 'object') return;
                
                const action = Reflect.get(cmdData, 'action');
                if (typeof action !== 'string') return;
                
                let payload: Record<string, string> | undefined;
                const rawPayload = Reflect.get(cmdData, 'payload');
                if (rawPayload && typeof rawPayload === 'object') {
                    payload = {};
                    for (const [key, value] of Object.entries(rawPayload)) {
                        if (typeof value === 'string') {
                            payload[key] = value;
                        }
                    }
                }
                
                const handler = launcherCommandHandlers[action];
                if (handler) {
                    handler(payload, navigate, setTasks);
                }
                
                api.restoreMainWindow();
            });
        }
    }, [navigate, setTasks]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) =>
            handleSettingsKeydown(e, settings.keybindingOpenSettings, navigate);
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [navigate, settings.keybindingOpenSettings]);
}
