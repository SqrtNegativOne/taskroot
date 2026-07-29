import { useCallback } from "react";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";
import type { AppTask as Task } from "../../core/domain/models";

export function useTaskCanvasActions(
    setTasks: (updater: (prev: Task[]) => Task[]) => void,
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number }
) {
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const positionUpdates = new Map();

            for (const change of changes) {
                if (change.type === "position" && change.position)
                    positionUpdates.set(change.id, change.position);
            }
            
            if (positionUpdates.size === 0) return;

            setTasks((prev) =>
                prev.map((t) => {
                    const newPos = positionUpdates.get(t.id);
                    if (!newPos) return t;

                    return {
                        ...t,
                        canvasX: newPos.x,
                        canvasY: newPos.y,
                    };
                })
            );
        },
        [setTasks],
    );

    const isValidConnection = useCallback((connection: Connection | Edge) => {
        if (
            connection.sourceHandle === "child" &&
            connection.targetHandle === "parent"
        )
            return true;
        if (
            connection.sourceHandle === "dependent" &&
            connection.targetHandle === "dependency"
        )
            return true;
        return false;
    }, []);

    const onConnect = useCallback(
        (connection: Connection) => {
            if (!isValidConnection(connection)) return;

            setTasks((prev) =>
                prev.map((t) => {
                    // connecting source (parent) bottom to target (child) top
                    if (
                        connection.target === t.id &&
                        connection.targetHandle === "parent" &&
                        connection.sourceHandle === "child"
                    ) {
                        return { ...t, parent_task: connection.source };
                    }
                    // connecting source (dependency) right to target (dependent) left
                    if (
                        connection.target === t.id &&
                        connection.targetHandle === "dependency" &&
                        connection.sourceHandle === "dependent"
                    ) {
                        const deps = t.dependencies || [];
                        if (!deps.includes(connection.source)) {
                            return {
                                ...t,
                                dependencies: [...deps, connection.source],
                            };
                        }
                    }
                    return t;
                }),
            );
        },
        [setTasks, isValidConnection],
    );

    const onNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
            setTasks((prev) =>
                prev.map((t) =>
                    deletedNodeIds.has(t.id) ? { ...t, onCanvas: false } : t
                )
            );
        },
        [setTasks]
    );

    const onEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            setTasks((prev) => {
                let updated = [...prev];
                for (const edge of deletedEdges) {
                    if (edge.targetHandle === "parent" && edge.sourceHandle === "child") {
                        // The connection from parent to this child was removed
                        updated = updated.map((t) =>
                            t.id === edge.target ? { ...t, parent_task: null } : t
                        );
                    }
                    if (edge.targetHandle === "dependency" && edge.sourceHandle === "dependent") {
                        // The dependency was removed
                        updated = updated.map((t) =>
                            t.id === edge.target
                                ? {
                                      ...t,
                                      dependencies: (t.dependencies || []).filter(
                                          (dep) => dep !== edge.source
                                      ),
                                  }
                                : t
                        );
                    }
                }
                return updated;
            });
        },
        [setTasks]
    );

    const onDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!(e.target instanceof HTMLElement)) return;
            if (e.target.closest(".react-flow__node")) return; // Do not create task if clicking on an existing node

            // Project screen coordinates to flow coordinates
            const position = screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
            });

            const id = `t${Date.now()}`;
            const newTask: Task = {
                id,
                title: "New Task",
                status: "todo",
                priority: 1,
                tags: [],
                subtasks: [],
                parent_task: null,
                dependencies: [],
                est: 60,
                added: new Date().toISOString(),
                onCanvas: true,
                canvasX: position.x,
                canvasY: position.y,
            };

            setTasks((ts) => [...ts, newTask]);
        },
        [setTasks, screenToFlowPosition],
    );

    return {
        onNodesChange,
        isValidConnection,
        onConnect,
        onNodesDelete,
        onEdgesDelete,
        onDoubleClick,
    };
}
