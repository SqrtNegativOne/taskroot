import React, { useCallback, useMemo } from "react";
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    Handle,
    Position,
    useReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AppTask as Task } from "../../core/domain/models";

type TaskCanvasProps = {
    tasks: Task[];
    setTasks: (updater: (prev: Task[]) => Task[]) => void;
};

import { TaskNodeComponent } from "./TaskNode";

const nodeTypes = {
    taskNode: TaskNodeComponent,
};

function TaskCanvasInner({ tasks, setTasks }: TaskCanvasProps) {
    const { screenToFlowPosition } = useReactFlow();

    const canvasTasks = useMemo(() => tasks.filter((t) => t.onCanvas), [tasks]);

    const nodes: Node[] = useMemo(() => {
        return canvasTasks.map((t) => ({
            id: t.id,
            type: "taskNode",
            position: { x: t.canvasX || 0, y: t.canvasY || 0 },
            data: { task: t },
        }));
    }, [canvasTasks]);

    const edges: Edge[] = useMemo(() => {
        const newEdges: Edge[] = [];

        // Create edges from tasks data
        for (const t of canvasTasks) {
            if (
                t.parent_task &&
                canvasTasks.some((ct) => ct.id === t.parent_task)
            ) {
                newEdges.push({
                    id: `e-${t.parent_task}-child-${t.id}`,
                    source: t.parent_task,
                    sourceHandle: "child",
                    target: t.id,
                    targetHandle: "parent",
                    animated: true,
                    style: { stroke: "var(--accent)" },
                });
            }

            if (t.dependencies) {
                for (const depId of t.dependencies) {
                    if (canvasTasks.some((ct) => ct.id === depId)) {
                        newEdges.push({
                            id: `e-${depId}-dependent-${t.id}`,
                            source: depId,
                            sourceHandle: "dependent",
                            target: t.id,
                            targetHandle: "dependency",
                            style: { stroke: "#d9866b" },
                        });
                    }
                }
            }
        }

        return newEdges;
    }, [canvasTasks]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // We only care about position changes to persist them
            setTasks((prev) => {
                let updated = [...prev];
                for (const change of changes) {
                    if (change.type === "position" && change.position) {
                        const pos = change.position;
                        updated = updated.map((t) =>
                            t.id === change.id
                                ? {
                                      ...t,
                                      canvasX: pos.x,
                                      canvasY: pos.y,
                                  }
                                : t,
                        );
                    }
                }
                return updated;
            });
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

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
            onDoubleClick={onDoubleClick}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                fitView
                colorMode="dark"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}

export function TaskCanvas(props: TaskCanvasProps) {
    return (
        <ReactFlowProvider>
            <TaskCanvasInner {...props} />
        </ReactFlowProvider>
    );
}
