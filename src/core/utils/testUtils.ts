import type { AppEvent, AppTask } from "../domain/models";

let nextId = 1;
export function createMockAppEvent(overrides: Partial<AppEvent> = {}): AppEvent {
    return {
        id: `mock-evt-${nextId++}`,
        title: "Mock Event",
        startTime: "2024-01-01T10:00:00",
        endTime: "2024-01-01T11:00:00",
        type: "busy",
        ...overrides,
    };
}

export function createMockAppTask(overrides: Partial<AppTask> = {}): AppTask {
    return {
        id: `mock-tsk-${nextId++}`,
        title: "Mock Task",
        status: "todo",
        priority: 0,
        tags: [],
        subtasks: [],
        ...overrides,
    };
}


export class MockFetch {
    private routes: Array<{
        pattern: string | RegExp;
        method: string;
        response: Response | ((url: string, init?: RequestInit) => Response | Promise<Response>);
    }> = [];

    mock(method: string, pattern: string | RegExp, response: Response | ((url: string, init?: RequestInit) => Response | Promise<Response>)) {
        this.routes.push({ pattern, method: method.toUpperCase(), response });
    }

    reset() {
        this.routes = [];
    }

    private matchRoute(route: { pattern: string | RegExp; method: string; response: Response | ((url: string, init?: RequestInit) => Response | Promise<Response>) }, urlStr: string, reqMethod: string, init?: RequestInit) {
        if (route.method !== reqMethod) return undefined;
        const matches = typeof route.pattern === "string" ? urlStr.includes(route.pattern) : route.pattern.test(urlStr);
        if (!matches) return undefined;
        return typeof route.response === "function" ? route.response(urlStr, init) : route.response;
    }

    handler = async (input: RequestInfo | URL, init?: RequestInit & { timeout?: number }): Promise<Response> => {
        const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
        const reqMethod = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

        for (const route of [...this.routes].toReversed()) {
            const res = this.matchRoute(route, urlStr, reqMethod, init);
            if (res) return res;
        }
        return new Response("Not Found", { status: 404 });
    };
}


