import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { AppTask as Task } from "../../core/domain/models";

export function useTaskGraphElements(tasks: Task[]) {
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

            if (!t.dependencies) continue;

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

        return newEdges;
    }, [canvasTasks]);

    return { nodes, edges };
}
