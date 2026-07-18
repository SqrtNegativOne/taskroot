import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type Task = {
  id: string;
  title: string;
  status: 'todo' | 'next-up' | 'doing' | 'done';
  priority: string;
  tags: string[];
  subtasks: any[];
  parent_task?: string | null;
  dependencies?: string[];
  est?: number;
  added: string;
  isDraft?: boolean;
  
  canvasX?: number;
  canvasY?: number;
  onCanvas?: boolean;
};

type TaskCanvasProps = {
  tasks: Task[];
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
};

// Custom Node Component
const TaskNodeComponent = ({ data, id }: any) => {
  const task = data.task as Task;
  
  return (
    <div className={`task-canvas-node ${task.status === 'done' ? 'is-done' : ''}`} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '12px',
      minWidth: '200px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      position: 'relative',
      opacity: task.status === 'done' ? 0.6 : 1
    }}>
      {/* Top Target Handle: Parent connection */}
      <Handle type="target" position={Position.Top} id="parent" style={{ background: 'var(--accent)' }} />
      
      {/* Left Target Handle: Dependency connection (This task requires the source task) */}
      <Handle type="target" position={Position.Left} id="dependency" style={{ background: '#d9866b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span className={`pri pri-${task.priority}`}>●</span>
        <strong style={{ color: 'var(--fg)' }}>{task.title}</strong>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {task.status && <span className={`status-pill status-${task.status.replace('-', '')}`}>{task.status}</span>}
      </div>

      {/* Bottom Source Handle: Subtask connection (Connects to a child task's Top) */}
      <Handle type="source" position={Position.Bottom} id="child" style={{ background: 'var(--accent)' }} />
      
      {/* Right Source Handle: Dependent connection (Connects to a dependent task's Left) */}
      <Handle type="source" position={Position.Right} id="dependent" style={{ background: '#d9866b' }} />
    </div>
  );
};

const nodeTypes = {
  taskNode: TaskNodeComponent,
};

function TaskCanvasInner({ tasks, setTasks }: TaskCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const canvasTasks = useMemo(() => tasks.filter(t => t.onCanvas), [tasks]);

  const nodes: Node[] = useMemo(() => {
    return canvasTasks.map(t => ({
      id: t.id,
      type: 'taskNode',
      position: { x: t.canvasX || 0, y: t.canvasY || 0 },
      data: { task: t },
    }));
  }, [canvasTasks]);

  const edges: Edge[] = useMemo(() => {
    const newEdges: Edge[] = [];
    
    // Create edges from tasks data
    for (const t of canvasTasks) {
      if (t.parent_task && canvasTasks.some(ct => ct.id === t.parent_task)) {
        newEdges.push({
          id: `e-${t.parent_task}-child-${t.id}`,
          source: t.parent_task,
          sourceHandle: 'child',
          target: t.id,
          targetHandle: 'parent',
          animated: true,
          style: { stroke: 'var(--accent)' }
        });
      }
      
      if (t.dependencies) {
        for (const depId of t.dependencies) {
          if (canvasTasks.some(ct => ct.id === depId)) {
             newEdges.push({
              id: `e-${depId}-dependent-${t.id}`,
              source: depId,
              sourceHandle: 'dependent',
              target: t.id,
              targetHandle: 'dependency',
              style: { stroke: '#d9866b' }
            });
          }
        }
      }
    }
    
    return newEdges;
  }, [canvasTasks]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // We only care about position changes to persist them
    setTasks(prev => {
      let updated = [...prev];
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updated = updated.map(t => 
            t.id === change.id 
              ? { ...t, canvasX: change.position!.x, canvasY: change.position!.y }
              : t
          );
        }
      }
      return updated;
    });
  }, [setTasks]);

  const isValidConnection = useCallback((connection: Connection) => {
    if (connection.sourceHandle === 'child' && connection.targetHandle === 'parent') return true;
    if (connection.sourceHandle === 'dependent' && connection.targetHandle === 'dependency') return true;
    return false;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (!isValidConnection(connection)) return;
    
    setTasks(prev => prev.map(t => {
      // connecting source (parent) bottom to target (child) top
      if (connection.target === t.id && connection.targetHandle === 'parent' && connection.sourceHandle === 'child') {
        return { ...t, parent_task: connection.source };
      }
      // connecting source (dependency) right to target (dependent) left
      if (connection.target === t.id && connection.targetHandle === 'dependency' && connection.sourceHandle === 'dependent') {
        const deps = t.dependencies || [];
        if (!deps.includes(connection.source)) {
          return { ...t, dependencies: [...deps, connection.source] };
        }
      }
      return t;
    }));
  }, [setTasks, isValidConnection]);
  
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node')) return; // Do not create task if clicking on an existing node
    
    // Project screen coordinates to flow coordinates
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    
    const id = `t${Date.now()}`;
    const newTask: Task = {
      id,
      title: 'New Task',
      status: 'todo',
      priority: 'P2',
      tags: [],
      subtasks: [],
      parent_task: null,
      dependencies: [],
      est: 60,
      added: new Date().toISOString(),
      onCanvas: true,
      canvasX: position.x,
      canvasY: position.y
    };
    
    setTasks(ts => [...ts, newTask]);
  }, [setTasks, screenToFlowPosition]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onDoubleClick={onDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
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
