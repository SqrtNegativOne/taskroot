import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AppTask as Task } from "../../core/domain/models";
import { TaskNodeComponent } from "./TaskNode";
import { useTaskGraphElements } from "./use-task-graph-elements";
import { useTaskCanvasActions } from "./use-task-canvas-actions";

type TaskCanvasProps = {
    tasks: Task[];
    setTasks: (updater: (prev: Task[]) => Task[]) => void;
};

const nodeTypes = {
    taskNode: TaskNodeComponent,
};

function TaskCanvasInner({ tasks, setTasks }: TaskCanvasProps) {
    const { screenToFlowPosition } = useReactFlow();

    const { nodes, edges } = useTaskGraphElements(tasks);
    const {
        onNodesChange,
        isValidConnection,
        onConnect,
        onNodesDelete,
        onEdgesDelete,
        onDoubleClick,
    } = useTaskCanvasActions(setTasks, screenToFlowPosition);

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
