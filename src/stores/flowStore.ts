import { create } from "zustand";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
  type Connection,
  type IsValidConnection,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import type { CustomNode, CustomEdge, CustomNodeData } from "@/types";
import type { WorkflowExecutionContext } from "@/types/workflow";
import { validateConnection } from "@/utils/connectionValidator";
import { WorkflowEngine } from "@/services/workflowEngine";
import { useCanvasStore } from "@/stores/canvasStore";
import { toast } from "@/stores/toastStore";

// 历史记录状态（用于撤销/重做）
interface HistoryState {
  nodes: CustomNode[];
  edges: CustomEdge[];
}

interface FlowStore {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // 多选支持
  selectedEdgeIds: string[]; // 边选择支持
  clipboard: { nodes: CustomNode[]; edges: CustomEdge[] } | null; // 剪贴板

  // 历史记录
  history: HistoryState[];
  historyIndex: number;
  maxHistoryLength: number;

  // 节点操作
  onNodesChange: OnNodesChange<CustomNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: string, position: { x: number; y: number }, data: CustomNodeData) => string;
  updateNodeData: <T extends CustomNodeData>(nodeId: string, data: Partial<T>) => void;
  removeNode: (nodeId: string) => void;
  removeNodes: (nodeIds: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // 多选操作
  setSelectedNodes: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 边操作
  setSelectedEdges: (edgeIds: string[]) => void;
  removeEdge: (edgeId: string) => void;
  removeEdges: (edgeIds: string[]) => void;

  // 复制/粘贴
  copySelectedNodes: () => void;
  pasteNodes: (offsetX?: number, offsetY?: number) => void;
  duplicateNodes: (nodeIds: string[]) => void;

  // 撤销/重做
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;

  // 节点对齐
  alignNodes: (direction: "left" | "right" | "top" | "bottom" | "centerH" | "centerV") => void;
  distributeNodes: (direction: "horizontal" | "vertical") => void;

  // 自动整理布局
  autoLayout: () => void;

  // 节点锁定
  lockNode: (nodeId: string) => void;
  unlockNode: (nodeId: string) => void;
  toggleNodeLock: (nodeId: string) => void;

  // 画布操作
  clearCanvas: () => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;

  // 连接验证
  isValidConnection: IsValidConnection;

  // 获取连接的节点数据（支持多图输入和文件输入）
  getConnectedInputData: (nodeId: string) => {
    prompt?: string;
    images: string[];
    files: Array<{ data: string; mimeType: string; fileName?: string }>;
  };

  // 获取连接的图片详细信息（包含 ID、文件名）
  getConnectedImagesWithInfo: (nodeId: string) => Array<{
    id: string;
    fileName?: string;
    imageData: string;
  }>;

  // 获取连接的文件详细信息（包含 ID、文件名、MIME类型）
  getConnectedFilesWithInfo: (nodeId: string) => Array<{
    id: string;
    fileName?: string;
    mimeType?: string;
    fileData: string;
  }>;

  // === 工作流执行 ===
  workflowExecution: WorkflowExecutionContext | null;
  workflowEngine: WorkflowEngine | null;

  // 执行整个工作流
  executeWorkflow: () => Promise<void>;

  // 从指定节点开始执行
  executeFromNode: (nodeId: string) => Promise<void>;

  // 暂停工作流
  pauseWorkflow: () => void;

  // 恢复工作流
  resumeWorkflow: () => void;

  // 取消工作流
  cancelWorkflow: () => void;

  // 清除工作流状态
  clearWorkflowExecution: () => void;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  clipboard: null,
  history: [],
  historyIndex: -1,
  maxHistoryLength: 50,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as CustomNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();

    // 验证连接
    const validationResult = validateConnection(connection, nodes, edges);

    if (!validationResult.isValid) {
      // 连接无效，不进行任何操作
      console.warn("连接被拒绝:", validationResult.reason);
      return;
    }

    get().saveToHistory();

    // 如果需要替换现有连接，先删除旧边
    let updatedEdges = edges;
    if (validationResult.existingEdge) {
      updatedEdges = edges.filter((e) => e.id !== validationResult.existingEdge!.id);
    }

    set({
      edges: addEdge(connection, updatedEdges),
    });
  },

  addNode: (type, position, data) => {
    get().saveToHistory();
    const id = uuidv4();
    const newNode: CustomNode = {
      id,
      type,
      position,
      data,
    };
    set({
      nodes: [...get().nodes, newNode],
    });
    return id;
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  removeNode: (nodeId) => {
    get().saveToHistory();
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
    });
  },

  removeNodes: (nodeIds) => {
    if (nodeIds.length === 0) return;
    get().saveToHistory();
    const nodeIdSet = new Set(nodeIds);
    set({
      nodes: get().nodes.filter((node) => !nodeIdSet.has(node.id)),
      edges: get().edges.filter(
        (edge) => !nodeIdSet.has(edge.source) && !nodeIdSet.has(edge.target)
      ),
      selectedNodeId: nodeIdSet.has(get().selectedNodeId || "") ? null : get().selectedNodeId,
      selectedNodeIds: [],
    });
  },

  setSelectedNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      selectedNodeIds: nodeId ? [nodeId] : [],
    });
  },

  // 多选操作
  setSelectedNodes: (nodeIds) => {
    set({
      selectedNodeIds: nodeIds,
      selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null,
    });
  },

  addToSelection: (nodeId) => {
    const { selectedNodeIds } = get();
    if (!selectedNodeIds.includes(nodeId)) {
      set({ selectedNodeIds: [...selectedNodeIds, nodeId] });
    }
  },

  removeFromSelection: (nodeId) => {
    set({
      selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
    });
  },

  selectAll: () => {
    set({
      selectedNodeIds: get().nodes.map((n) => n.id),
    });
  },

  clearSelection: () => {
    set({
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  // 边操作
  setSelectedEdges: (edgeIds) => {
    set({ selectedEdgeIds: edgeIds });
  },

  removeEdge: (edgeId) => {
    get().saveToHistory();
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
      selectedEdgeIds: get().selectedEdgeIds.filter((id) => id !== edgeId),
    });
  },

  removeEdges: (edgeIds) => {
    if (edgeIds.length === 0) return;
    get().saveToHistory();
    const edgeIdSet = new Set(edgeIds);
    set({
      edges: get().edges.filter((edge) => !edgeIdSet.has(edge.id)),
      selectedEdgeIds: [],
    });
  },

  // 复制/粘贴
  copySelectedNodes: () => {
    const { nodes, edges, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;

    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    // 复制相关的边（源和目标都在选中节点中）
    const relatedEdges = edges.filter(
      (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    );

    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(selectedNodes)),
        edges: JSON.parse(JSON.stringify(relatedEdges)),
      },
    });
  },

  pasteNodes: (offsetX = 50, offsetY = 50) => {
    const { clipboard } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;

    get().saveToHistory();

    // 创建 ID 映射
    const idMap = new Map<string, string>();
    clipboard.nodes.forEach((node) => {
      idMap.set(node.id, uuidv4());
    });

    // 创建新节点，带偏移
    const newNodes: CustomNode[] = clipboard.nodes.map((node) => ({
      ...node,
      id: idMap.get(node.id)!,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
      selected: false,
    }));

    // 创建新边，更新引用
    const newEdges: CustomEdge[] = clipboard.edges.map((edge) => ({
      ...edge,
      id: uuidv4(),
      source: idMap.get(edge.source)!,
      target: idMap.get(edge.target)!,
    }));

    set({
      nodes: [...get().nodes, ...newNodes],
      edges: [...get().edges, ...newEdges],
      selectedNodeIds: newNodes.map((n) => n.id),
    });
  },

  duplicateNodes: (nodeIds) => {
    if (nodeIds.length === 0) return;
    const { nodes, edges } = get();

    get().saveToHistory();

    const nodesToDuplicate = nodes.filter((n) => nodeIds.includes(n.id));
    const idMap = new Map<string, string>();
    nodesToDuplicate.forEach((node) => {
      idMap.set(node.id, uuidv4());
    });

    const newNodes: CustomNode[] = nodesToDuplicate.map((node) => ({
      ...node,
      id: idMap.get(node.id)!,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    }));

    // 复制内部边
    const relatedEdges = edges.filter(
      (e) => nodeIds.includes(e.source) && nodeIds.includes(e.target)
    );
    const newEdges: CustomEdge[] = relatedEdges.map((edge) => ({
      ...edge,
      id: uuidv4(),
      source: idMap.get(edge.source)!,
      target: idMap.get(edge.target)!,
    }));

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
      selectedNodeIds: newNodes.map((n) => n.id),
    });
  },

  // 撤销/重做
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex, maxHistoryLength } = get();
    // 截断历史到当前位置，添加新状态
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    // 限制历史长度
    if (newHistory.length > maxHistoryLength) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get();
    if (historyIndex < 0) return;

    // 如果是第一次撤销，先保存当前状态
    if (historyIndex === history.length - 1) {
      const newHistory = [...history, {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      }];
      set({
        history: newHistory,
        historyIndex: historyIndex,
      });
    }

    const previousState = history[historyIndex];
    set({
      nodes: previousState.nodes,
      edges: previousState.edges,
      historyIndex: historyIndex - 1,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 2) return;

    const nextState = history[historyIndex + 2];
    set({
      nodes: nextState.nodes,
      edges: nextState.edges,
      historyIndex: historyIndex + 1,
    });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 2,

  // 节点对齐
  alignNodes: (direction) => {
    const { nodes, selectedNodeIds } = get();
    if (selectedNodeIds.length < 2) return;

    get().saveToHistory();

    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

    let targetValue: number;
    switch (direction) {
      case "left":
        targetValue = Math.min(...selectedNodes.map((n) => n.position.x));
        break;
      case "right":
        targetValue = Math.max(...selectedNodes.map((n) => n.position.x));
        break;
      case "top":
        targetValue = Math.min(...selectedNodes.map((n) => n.position.y));
        break;
      case "bottom":
        targetValue = Math.max(...selectedNodes.map((n) => n.position.y));
        break;
      case "centerH":
        targetValue = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
        break;
      case "centerV":
        targetValue = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;
        break;
    }

    set({
      nodes: nodes.map((node) => {
        if (!selectedNodeIds.includes(node.id)) return node;

        const newPosition = { ...node.position };
        if (direction === "left" || direction === "right" || direction === "centerH") {
          newPosition.x = targetValue;
        } else {
          newPosition.y = targetValue;
        }
        return { ...node, position: newPosition };
      }),
    });
  },

  distributeNodes: (direction) => {
    const { nodes, selectedNodeIds } = get();
    if (selectedNodeIds.length < 3) return;

    get().saveToHistory();

    const selectedNodes = nodes
      .filter((n) => selectedNodeIds.includes(n.id))
      .sort((a, b) =>
        direction === "horizontal"
          ? a.position.x - b.position.x
          : a.position.y - b.position.y
      );

    const first = selectedNodes[0];
    const last = selectedNodes[selectedNodes.length - 1];
    const totalDistance =
      direction === "horizontal"
        ? last.position.x - first.position.x
        : last.position.y - first.position.y;
    const gap = totalDistance / (selectedNodes.length - 1);

    const positionMap = new Map<string, { x: number; y: number }>();
    selectedNodes.forEach((node, index) => {
      positionMap.set(node.id, {
        x: direction === "horizontal" ? first.position.x + gap * index : node.position.x,
        y: direction === "vertical" ? first.position.y + gap * index : node.position.y,
      });
    });

    set({
      nodes: nodes.map((node) => {
        const newPos = positionMap.get(node.id);
        return newPos ? { ...node, position: newPos } : node;
      }),
    });
  },

  // 自动整理布局（基于拓扑排序的层级布局）
  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    get().saveToHistory();

    // 构建邻接表和入度表
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // 初始化
    nodes.forEach((node) => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // 构建图
    edges.forEach((edge) => {
      if (adjacencyList.has(edge.source) && nodeMap.has(edge.target)) {
        adjacencyList.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    });

    // 拓扑排序，按层级分组
    const layers: string[][] = [];
    const visited = new Set<string>();
    let currentLayer = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach((id) => visited.add(id));

      const nextLayer: string[] = [];
      currentLayer.forEach((nodeId) => {
        adjacencyList.get(nodeId)?.forEach((targetId) => {
          if (!visited.has(targetId)) {
            // 检查所有前置节点都已访问
            const allPredecessorsVisited = edges
              .filter((e) => e.target === targetId)
              .every((e) => visited.has(e.source));
            if (allPredecessorsVisited && !nextLayer.includes(targetId)) {
              nextLayer.push(targetId);
            }
          }
        });
      });

      currentLayer = nextLayer;
    }

    // 处理没有连接的孤立节点
    const unvisitedNodes = nodes.filter((n) => !visited.has(n.id));
    if (unvisitedNodes.length > 0) {
      layers.push(unvisitedNodes.map((n) => n.id));
    }

    // 计算布局位置
    const nodeWidth = 280;
    const nodeHeight = 200;
    const horizontalGap = 100;
    const verticalGap = 60;
    const startX = 100;
    const startY = 100;

    const positionMap = new Map<string, { x: number; y: number }>();

    layers.forEach((layer, layerIndex) => {
      const layerHeight = layer.length * nodeHeight + (layer.length - 1) * verticalGap;
      const layerStartY = startY + (layerHeight > 0 ? -layerHeight / 2 + nodeHeight / 2 : 0);

      layer.forEach((nodeId, nodeIndex) => {
        positionMap.set(nodeId, {
          x: startX + layerIndex * (nodeWidth + horizontalGap),
          y: layerStartY + nodeIndex * (nodeHeight + verticalGap) + 200,
        });
      });
    });

    set({
      nodes: nodes.map((node) => ({
        ...node,
        position: positionMap.get(node.id) || node.position,
      })),
    });
  },

  // 节点锁定
  lockNode: (nodeId) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, draggable: false } : node
      ),
    });
  },

  unlockNode: (nodeId) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, draggable: true } : node
      ),
    });
  },

  toggleNodeLock: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      if (node.draggable === false) {
        get().unlockNode(nodeId);
      } else {
        get().lockNode(nodeId);
      }
    }
  },

  clearCanvas: () => {
    get().saveToHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  setNodes: (nodes) => {
    set({ nodes: nodes as CustomNode[] });
  },

  setEdges: (edges) => {
    set({ edges });
  },

  isValidConnection: (edgeOrConnection) => {
    const { nodes, edges } = get();
    // 将 Edge | Connection 统一转换为 Connection 格式
    const connection: Connection = {
      source: edgeOrConnection.source,
      target: edgeOrConnection.target,
      sourceHandle: edgeOrConnection.sourceHandle ?? null,
      targetHandle: edgeOrConnection.targetHandle ?? null,
    };
    const result = validateConnection(connection, nodes, edges);
    return result.isValid;
  },

  getConnectedInputData: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    let prompt: string | undefined;
    const images: string[] = [];
    const files: Array<{ data: string; mimeType: string; fileName?: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      // 使用 targetHandle 来确定数据类型
      const targetHandle = edge.targetHandle;

      if (targetHandle === "input-prompt") {
        // 从 prompt 输入端口连接的数据
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          prompt = data.prompt;
        } else if (sourceNode.type === "llmContentNode") {
          // 支持从 LLM 内容生成节点获取输出作为 prompt
          const data = sourceNode.data as { outputContent?: string };
          prompt = data.outputContent;
        }
      } else if (targetHandle === "input-image") {
        // 从 image 输入端口连接的数据（支持多图）
        let imageData: string | undefined;
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string };
          imageData = data.imageData;
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          // 支持从图片生成节点获取输出图片
          const data = sourceNode.data as { outputImage?: string };
          imageData = data.outputImage;
        }
        if (imageData) {
          images.push(imageData);
        }
      } else if (targetHandle === "input-file") {
        // 从 file 输入端口连接的数据（支持多文件）
        if (sourceNode.type === "fileUploadNode") {
          const data = sourceNode.data as { fileData?: string; mimeType?: string; fileName?: string };
          if (data.fileData && data.mimeType) {
            files.push({
              data: data.fileData,
              mimeType: data.mimeType,
              fileName: data.fileName,
            });
          }
        }
      } else {
        // 兼容旧的没有 handle ID 的连接（向后兼容）
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          prompt = data.prompt;
        } else if (sourceNode.type === "llmContentNode") {
          // 支持从 LLM 内容生成节点获取输出作为 prompt
          const data = sourceNode.data as { outputContent?: string };
          prompt = data.outputContent;
        } else if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string };
          if (data.imageData) {
            images.push(data.imageData);
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string };
          if (data.outputImage) {
            images.push(data.outputImage);
          }
        } else if (sourceNode.type === "fileUploadNode") {
          // 文件上传节点的兼容处理
          const data = sourceNode.data as { fileData?: string; mimeType?: string; fileName?: string };
          if (data.fileData && data.mimeType) {
            files.push({
              data: data.fileData,
              mimeType: data.mimeType,
              fileName: data.fileName,
            });
          }
        }
      }
    }

    return { prompt, images, files };
  },

  // 获取连接的图片详细信息（包含 ID、文件名）
  getConnectedImagesWithInfo: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const images: Array<{ id: string; fileName?: string; imageData: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      // 只处理图片输入端口
      if (targetHandle === "input-image" || !targetHandle) {
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; fileName?: string };
          if (data.imageData) {
            images.push({
              id: sourceNode.id,
              fileName: data.fileName || `图片-${sourceNode.id.slice(0, 4)}`,
              imageData: data.imageData,
            });
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; label?: string };
          if (data.outputImage) {
            images.push({
              id: sourceNode.id,
              fileName: data.label || `生成-${sourceNode.id.slice(0, 4)}`,
              imageData: data.outputImage,
            });
          }
        }
      }
    }

    return images;
  },

  // 获取连接的文件详细信息（包含 ID、文件名、MIME类型）
  getConnectedFilesWithInfo: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const files: Array<{ id: string; fileName?: string; mimeType?: string; fileData: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      // 只处理文件输入端口
      if (targetHandle === "input-file" || !targetHandle) {
        if (sourceNode.type === "fileUploadNode") {
          const data = sourceNode.data as { fileData?: string; fileName?: string; mimeType?: string };
          if (data.fileData) {
            files.push({
              id: sourceNode.id,
              fileName: data.fileName || `文件-${sourceNode.id.slice(0, 4)}`,
              mimeType: data.mimeType,
              fileData: data.fileData,
            });
          }
        }
      }
    }

    return files;
  },

  // === 工作流执行状态和方法 ===
  workflowExecution: null,
  workflowEngine: null,

  executeWorkflow: async () => {
    const { nodes, edges } = get();
    const { activeCanvasId } = useCanvasStore.getState();

    if (!activeCanvasId) {
      toast.error("画布未初始化");
      return;
    }

    if (nodes.length === 0) {
      toast.error("画布为空，无法执行");
      return;
    }

    // 创建新的工作流引擎实例
    const engine = new WorkflowEngine({
      maxParallelNodes: 3,
      skipInputNodes: true,
    });

    // 订阅状态变更
    const unsubscribe = engine.onStatusChange((context) => {
      set({ workflowExecution: context });
    });

    set({
      workflowEngine: engine,
      workflowExecution: {
        status: "running",
        nodeStatuses: {},
        errors: {},
        progress: { completed: 0, total: 0 },
      },
    });

    try {
      const result = await engine.executeWorkflow(
        nodes as CustomNode[],
        edges,
        activeCanvasId
      );

      set({ workflowExecution: result });

      // 显示结果通知
      if (result.status === "completed") {
        toast.success(`工作流执行完成 (${result.progress.completed}/${result.progress.total})`);
      } else if (result.status === "error") {
        const errorCount = Object.keys(result.errors).length;
        toast.error(`工作流执行完成，${errorCount} 个节点失败`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "执行失败";
      toast.error(`工作流执行失败: ${errorMessage}`);
    } finally {
      unsubscribe();
      set({ workflowEngine: null });
    }
  },

  executeFromNode: async (nodeId: string) => {
    const { nodes, edges } = get();
    const { activeCanvasId } = useCanvasStore.getState();

    if (!activeCanvasId) {
      toast.error("画布未初始化");
      return;
    }

    const startNode = nodes.find((n) => n.id === nodeId);
    if (!startNode) {
      toast.error("节点未找到");
      return;
    }

    // 创建新的工作流引擎实例
    const engine = new WorkflowEngine({
      maxParallelNodes: 3,
      skipInputNodes: true,
    });

    // 订阅状态变更
    const unsubscribe = engine.onStatusChange((context) => {
      set({ workflowExecution: context });
    });

    set({
      workflowEngine: engine,
      workflowExecution: {
        status: "running",
        nodeStatuses: {},
        errors: {},
        progress: { completed: 0, total: 0 },
      },
    });

    try {
      const result = await engine.executeFromNode(
        nodeId,
        nodes as CustomNode[],
        edges,
        activeCanvasId
      );

      set({ workflowExecution: result });

      // 显示结果通知
      if (result.status === "completed") {
        toast.success(`部分工作流执行完成 (${result.progress.completed}/${result.progress.total})`);
      } else if (result.status === "error") {
        const errorCount = Object.keys(result.errors).length;
        toast.error(`部分工作流执行完成，${errorCount} 个节点失败`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "执行失败";
      toast.error(`工作流执行失败: ${errorMessage}`);
    } finally {
      unsubscribe();
      set({ workflowEngine: null });
    }
  },

  pauseWorkflow: () => {
    const { workflowEngine } = get();
    if (workflowEngine) {
      workflowEngine.pause();
      toast.info("工作流已暂停");
    }
  },

  resumeWorkflow: () => {
    const { workflowEngine } = get();
    if (workflowEngine) {
      workflowEngine.resume();
      toast.info("工作流继续执行");
    }
  },

  cancelWorkflow: () => {
    const { workflowEngine } = get();
    if (workflowEngine) {
      workflowEngine.cancel();
      toast.info("工作流已取消");
    }
    set({ workflowExecution: null, workflowEngine: null });
  },

  clearWorkflowExecution: () => {
    set({ workflowExecution: null, workflowEngine: null });
  },
}));
