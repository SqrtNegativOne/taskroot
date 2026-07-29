import { useCallback } from "react";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";
import type { AppTask as Task } from "../../core/domain/models";

const applyConnection = (prev: Task[], connection: Connection | Edge): Task[] => 
    prev.map(t => {
        if (connection.target === t.id && connection.targetHandle === "parent" && connection.sourceHandle === "child") return { ...t, parent_task: connection.source };
        if (connection.target === t.id && connection.targetHandle === "dependency" && connection.sourceHandle === "dependent") {
            const deps = t.dependencies || [];
            if (!deps.includes(connection.source)) return { ...t, dependencies: [...deps, connection.source] };
        }
        return t;
    });

const applyEdgeDeletions = (prev: Task[], deletedEdges: Edge[]): Task[] => {
    let updated = [...prev];
    for (const edge of deletedEdges) {
        if (edge.targetHandle === "parent" && edge.sourceHandle === "child") updated = updated.map(t => t.id === edge.target ? { ...t, parent_task: undefined } : t);
        if (edge.targetHandle === "dependency" && edge.sourceHandle === "dependent") updated = updated.map(t => t.id === edge.target ? { ...t, dependencies: (t.dependencies || []).filter(dep => dep !== edge.source) } : t);
    }
    return updated;
};

const createDefaultCanvasTask = (id: string, position: {x: number, y: number}): Task => ({
    id, title: "New Task", status: "todo", priority: 1, tags: [], subtasks: [], 
    parent_task: undefined, dependencies: [], est: 60, added: new Date().toISOString(), 
    onCanvas: true, canvasX: position.x, canvasY: position.y
});

export function useTaskCanvasActions(
    setTasks: (updater: (prev: Task[]) => Task[]) => void,
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number }
) {
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const positionUpdates = new Map<string, {x: number, y: number}>();
        for (const change of changes) {
            if (change.type === "position" && change.position) positionUpdates.set(change.id, change.position);
        }
        if (positionUpdates.size === 0) return;
        setTasks(prev => prev.map(t => {
            const pos = positionUpdates.get(t.id);
            return pos ? { ...t, canvasX: pos.x, canvasY: pos.y } : t;
        }));
    }, [setTasks]);

    const isValidConnection = useCallback((connection: Connection | Edge) => 
        (connection.sourceHandle === "child" && connection.targetHandle === "parent") ||
        (connection.sourceHandle === "dependent" && connection.targetHandle === "dependency"), []);

    const onConnect = useCallback((connection: Connection) => {
        if (isValidConnection(connection)) setTasks(prev => applyConnection(prev, connection));
    }, [setTasks, isValidConnection]);

    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
        setTasks(prev => prev.map(t => deletedNodeIds.has(t.id) ? { ...t, onCanvas: false } : t));
    }, [setTasks]);

    const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
        setTasks(prev => applyEdgeDeletions(prev, deletedEdges));
    }, [setTasks]);

    const onDoubleClick = useCallback((e: React.MouseEvent) => {
        if (!(e.target instanceof HTMLElement) || e.target.closest(".react-flow__node")) return;
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setTasks(ts => [...ts, createDefaultCanvasTask(`t${Date.now()}`, position)]);
    }, [setTasks, screenToFlowPosition]);

    return {
        onNodesChange,
        isValidConnection,
        onConnect,
        onNodesDelete,
        onEdgesDelete,
        onDoubleClick,
    };
}
