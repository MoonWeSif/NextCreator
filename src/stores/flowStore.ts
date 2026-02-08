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
import type { PromptNodeTemplate } from "@/config/promptConfig";
import { validateConnection } from "@/utils/connectionValidator";
import { WorkflowEngine } from "@/services/workflowEngine";
import { useCanvasStore } from "@/stores/canvasStore";
import { toast } from "@/stores/toastStore";
import { readImage } from "@/services/fileStorageService";

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
  addPromptTemplate: (
    position: { x: number; y: number },
    promptText: string,
    template: PromptNodeTemplate
  ) => string[];
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

  // 获取连接的节点数据（支持多图输入和文件输入）- 同步版本，用于检测连接状态
  getConnectedInputData: (nodeId: string) => {
    prompt?: string;
    images: string[];
    files: Array<{ data: string; mimeType: string; fileName?: string }>;
  };

  // 获取连接的节点数据 - 异步版本，从文件按需加载图片数据
  getConnectedInputDataAsync: (nodeId: string) => Promise<{
    prompt?: string;
    images: string[];
    files: Array<{ data: string; mimeType: string; fileName?: string }>;
  }>;

  // 获取连接的图片详细信息（包含 ID、文件名、路径）- 同步版本
  getConnectedImagesWithInfo: (nodeId: string) => Array<{
    id: string;
    fileName?: string;
    imageData: string;
    imagePath?: string;
  }>;

  // 获取连接的图片详细信息 - 异步版本，从文件按需加载图片数据
  getConnectedImagesWithInfoAsync: (nodeId: string) => Promise<Array<{
    id: string;
    fileName?: string;
    imageData: string;
    imagePath?: string;
  }>>;

  // 获取连接的文件详细信息（包含 ID、文件名、MIME类型）
  getConnectedFilesWithInfo: (nodeId: string) => Array<{
    id: string;
    fileName?: string;
    mimeType?: string;
    fileData: string;
  }>;

  // 检测空输入连接：返回连接了但数据为空的输入类型
  getEmptyConnectedInputs: (nodeId: string) => {
    emptyImages: Array<{ id: string; label: string }>;
    emptyFiles: Array<{ id: string; label: string }>;
    emptyPrompts: Array<{ id: string; label: string }>;
  };

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

  // 添加提示词模板（创建多个已连接的节点）
  addPromptTemplate: (position, promptText, template) => {
    get().saveToHistory();

    const nodeIds: string[] = [];
    const newNodes: CustomNode[] = [];
    const newEdges: CustomEdge[] = [];

    // 节点尺寸和间距配置
    const nodeWidth = 280;
    const horizontalGap = 80;
    let currentX = position.x;

    // 1. 如果需要图片输入，创建图片输入节点
    if (template.requiresImageInput) {
      const imageInputId = uuidv4();
      nodeIds.push(imageInputId);
      newNodes.push({
        id: imageInputId,
        type: "imageInputNode",
        position: { x: currentX, y: position.y },
        data: {
          label: "图片输入",
        } as CustomNodeData,
      });
      currentX += nodeWidth + horizontalGap;
    }

    // 2. 创建提示词节点
    const promptNodeId = uuidv4();
    nodeIds.push(promptNodeId);
    newNodes.push({
      id: promptNodeId,
      type: "promptNode",
      position: { x: currentX, y: position.y + (template.requiresImageInput ? 100 : 0) },
      data: {
        label: "提示词",
        prompt: promptText,
      } as CustomNodeData,
    });
    currentX += nodeWidth + horizontalGap;

    // 3. 创建图片生成节点
    const generatorNodeId = uuidv4();
    nodeIds.push(generatorNodeId);
    const generatorType = template.generatorType === "pro"
      ? "imageGeneratorProNode"
      : "imageGeneratorFastNode";
    const generatorLabel = template.generatorType === "pro"
      ? "NanoBanana Pro"
      : "NanoBanana";
    const generatorModel = template.generatorType === "pro"
      ? "gemini-3-pro-image-preview"
      : "gemini-2.5-flash-image";

    newNodes.push({
      id: generatorNodeId,
      type: generatorType,
      position: { x: currentX, y: position.y + 50 },
      data: {
        label: generatorLabel,
        model: generatorModel,
        aspectRatio: template.aspectRatio,
        imageSize: template.generatorType === "pro" ? "2K" : "1K",
        status: "idle",
      } as CustomNodeData,
    });

    // 4. 创建连接
    // 提示词 -> 生成器
    newEdges.push({
      id: uuidv4(),
      source: promptNodeId,
      target: generatorNodeId,
      sourceHandle: "output-prompt",
      targetHandle: "input-prompt",
      type: "smoothstep",
      animated: true,
    });

    // 如果有图片输入，连接到生成器
    if (template.requiresImageInput && nodeIds.length >= 3) {
      const imageInputId = nodeIds[0];
      newEdges.push({
        id: uuidv4(),
        source: imageInputId,
        target: generatorNodeId,
        sourceHandle: "output-image",
        targetHandle: "input-image",
        type: "smoothstep",
        animated: true,
      });
    }

    // 5. 更新状态
    set({
      nodes: [...get().nodes, ...newNodes],
      edges: [...get().edges, ...newEdges],
      selectedNodeIds: nodeIds,
    });

    return nodeIds;
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
    const newNodes: CustomNode[] = clipboard.nodes.map((node) => {
      // 清除图片节点的文件路径，保留 base64 数据
      // 这样在新画布中生成时会重新保存到正确的目录
      let cleanedData = { ...node.data };

      if (node.type === "imageInputNode") {
        cleanedData = {
          ...cleanedData,
          imagePath: undefined,  // 清除旧路径，保留 imageData 和 fileName
        };
      } else if (node.type === "imageGeneratorProNode" || node.type === "imageGeneratorFastNode") {
        cleanedData = {
          ...cleanedData,
          outputImagePath: undefined,  // 清除旧路径，保留 outputImage
        };
      }

      return {
        ...node,
        id: idMap.get(node.id)!,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        data: cleanedData,
        selected: false,
      };
    });

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

    const newNodes: CustomNode[] = nodesToDuplicate.map((node) => {
      // 清除图片节点的文件路径，保留 base64 数据
      let cleanedData = { ...node.data };

      if (node.type === "imageInputNode") {
        cleanedData = {
          ...cleanedData,
          imagePath: undefined,  // 清除旧路径，保留 imageData 和 fileName
        };
      } else if (node.type === "imageGeneratorProNode" || node.type === "imageGeneratorFastNode") {
        cleanedData = {
          ...cleanedData,
          outputImagePath: undefined,  // 清除旧路径，保留 outputImage
        };
      }

      return {
        ...node,
        id: idMap.get(node.id)!,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: cleanedData,
        selected: false,
      };
    });

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

    // 支持多个 prompt 输入，收集后拼接
    const prompts: string[] = [];
    const images: string[] = [];
    const files: Array<{ data: string; mimeType: string; fileName?: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      // 使用 targetHandle 来确定数据类型
      const targetHandle = edge.targetHandle;

      if (targetHandle === "input-prompt") {
        // 从 prompt 输入端口连接的数据（支持多个，会自动拼接）
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          if (data.prompt) prompts.push(data.prompt);
        } else if (sourceNode.type === "llmContentNode") {
          // 支持从 LLM 内容生成节点获取输出作为 prompt
          const data = sourceNode.data as { outputContent?: string };
          if (data.outputContent) prompts.push(data.outputContent);
        }
      } else if (targetHandle === "input-image") {
        // 从 image 输入端口连接的数据（支持多图）
        // 同时检查 imageData 和 imagePath，任一有值则表示有图片
        let hasImage = false;
        let imageData: string | undefined;
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string };
          imageData = data.imageData;
          hasImage = !!(data.imageData || data.imagePath);
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          // 支持从图片生成节点获取输出图片
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
          imageData = data.outputImage;
          hasImage = !!(data.outputImage || data.outputImagePath);
        }
        if (hasImage) {
          // 使用实际数据或占位值（同步版本可能没有 base64 数据）
          images.push(imageData || "");
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
          if (data.prompt) prompts.push(data.prompt);
        } else if (sourceNode.type === "llmContentNode") {
          // 支持从 LLM 内容生成节点获取输出作为 prompt
          const data = sourceNode.data as { outputContent?: string };
          if (data.outputContent) prompts.push(data.outputContent);
        } else if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string };
          // 同时检查 imageData 和 imagePath
          if (data.imageData || data.imagePath) {
            images.push(data.imageData || "");
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
          // 同时检查 outputImage 和 outputImagePath
          if (data.outputImage || data.outputImagePath) {
            images.push(data.outputImage || "");
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

    // 将多个 prompt 拼接成一个字符串，用换行符分隔
    const prompt = prompts.length > 0 ? prompts.join("\n\n") : undefined;
    return { prompt, images, files };
  },

  // 获取连接的节点数据 - 异步版本，从文件按需加载图片数据
  getConnectedInputDataAsync: async (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    // 支持多个 prompt 输入，收集后拼接
    const prompts: string[] = [];
    const images: string[] = [];
    const files: Array<{ data: string; mimeType: string; fileName?: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      if (targetHandle === "input-prompt") {
        // 从 prompt 输入端口连接的数据（支持多个，会自动拼接）
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          if (data.prompt) prompts.push(data.prompt);
        } else if (sourceNode.type === "llmContentNode") {
          const data = sourceNode.data as { outputContent?: string };
          if (data.outputContent) prompts.push(data.outputContent);
        }
      } else if (targetHandle === "input-image") {
        // 从 image 输入端口连接的数据 - 按需从文件加载
        let imageData: string | undefined;
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string };
          // 优先从文件加载，否则使用内存中的数据
          if (data.imagePath) {
            try {
              imageData = await readImage(data.imagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.imageData;  // 回退到内存数据
            }
          } else {
            imageData = data.imageData;
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
          // 优先从文件加载，否则使用内存中的数据
          if (data.outputImagePath) {
            try {
              imageData = await readImage(data.outputImagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.outputImage;  // 回退到内存数据
            }
          } else {
            imageData = data.outputImage;
          }
        }
        if (imageData) {
          images.push(imageData);
        }
      } else if (targetHandle === "input-file") {
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
        // 兼容旧的没有 handle ID 的连接
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          if (data.prompt) prompts.push(data.prompt);
        } else if (sourceNode.type === "llmContentNode") {
          const data = sourceNode.data as { outputContent?: string };
          if (data.outputContent) prompts.push(data.outputContent);
        } else if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string };
          let imageData: string | undefined;
          if (data.imagePath) {
            try {
              imageData = await readImage(data.imagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.imageData;
            }
          } else {
            imageData = data.imageData;
          }
          if (imageData) {
            images.push(imageData);
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
          let imageData: string | undefined;
          if (data.outputImagePath) {
            try {
              imageData = await readImage(data.outputImagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.outputImage;
            }
          } else {
            imageData = data.outputImage;
          }
          if (imageData) {
            images.push(imageData);
          }
        } else if (sourceNode.type === "fileUploadNode") {
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

    // 将多个 prompt 拼接成一个字符串，用换行符分隔
    const prompt = prompts.length > 0 ? prompts.join("\n\n") : undefined;
    return { prompt, images, files };
  },

  // 获取连接的图片详细信息（包含 ID、文件名、路径）- 同步版本，用于检测连接状态
  getConnectedImagesWithInfo: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const images: Array<{ id: string; fileName?: string; imageData: string; imagePath?: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      // 只处理图片输入端口
      if (targetHandle === "input-image" || !targetHandle) {
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; fileName?: string; imagePath?: string };
          // 同时检查 imageData 和 imagePath，任一有值则表示有图片
          if (data.imageData || data.imagePath) {
            images.push({
              id: sourceNode.id,
              fileName: data.fileName || `图片-${sourceNode.id.slice(0, 4)}`,
              imageData: data.imageData || "",  // 同步版本可能没有 base64 数据
              imagePath: data.imagePath,
            });
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; label?: string; outputImagePath?: string };
          // 同时检查 outputImage 和 outputImagePath，任一有值则表示有图片
          if (data.outputImage || data.outputImagePath) {
            images.push({
              id: sourceNode.id,
              fileName: data.label || `生成-${sourceNode.id.slice(0, 4)}`,
              imageData: data.outputImage || "",  // 同步版本可能没有 base64 数据
              imagePath: data.outputImagePath,
            });
          }
        }
      }
    }

    return images;
  },

  // 获取连接的图片详细信息 - 异步版本，从文件按需加载图片数据
  getConnectedImagesWithInfoAsync: async (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const images: Array<{ id: string; fileName?: string; imageData: string; imagePath?: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      // 只处理图片输入端口
      if (targetHandle === "input-image" || !targetHandle) {
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; fileName?: string; imagePath?: string };
          let imageData: string | undefined;
          // 优先从文件加载
          if (data.imagePath) {
            try {
              imageData = await readImage(data.imagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.imageData;
            }
          } else {
            imageData = data.imageData;
          }
          if (imageData) {
            images.push({
              id: sourceNode.id,
              fileName: data.fileName || `图片-${sourceNode.id.slice(0, 4)}`,
              imageData,
              imagePath: data.imagePath,
            });
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; label?: string; outputImagePath?: string };
          let imageData: string | undefined;
          // 优先从文件加载
          if (data.outputImagePath) {
            try {
              imageData = await readImage(data.outputImagePath);
            } catch (err) {
              console.warn("从文件加载图片失败:", err);
              imageData = data.outputImage;
            }
          } else {
            imageData = data.outputImage;
          }
          if (imageData) {
            images.push({
              id: sourceNode.id,
              fileName: data.label || `生成-${sourceNode.id.slice(0, 4)}`,
              imageData,
              imagePath: data.outputImagePath,
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

  // 检测空输入连接：返回连接了但数据为空的输入类型
  getEmptyConnectedInputs: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const emptyImages: Array<{ id: string; label: string }> = [];
    const emptyFiles: Array<{ id: string; label: string }> = [];
    const emptyPrompts: Array<{ id: string; label: string }> = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      // 检测图片输入（同时检查 base64 数据和文件路径）
      if (targetHandle === "input-image" || (!targetHandle && sourceNode.type === "imageInputNode")) {
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string; label?: string };
          // 同时检查 imageData 和 imagePath，任一有值则不为空
          if (!data.imageData && !data.imagePath) {
            emptyImages.push({
              id: sourceNode.id,
              label: (data.label as string) || "图片输入",
            });
          }
        } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string; label?: string };
          // 同时检查 outputImage 和 outputImagePath，任一有值则不为空
          if (!data.outputImage && !data.outputImagePath) {
            emptyImages.push({
              id: sourceNode.id,
              label: (data.label as string) || "图片生成",
            });
          }
        }
      }

      // 检测文件输入
      if (targetHandle === "input-file" || (!targetHandle && sourceNode.type === "fileUploadNode")) {
        if (sourceNode.type === "fileUploadNode") {
          const data = sourceNode.data as { fileData?: string; label?: string };
          if (!data.fileData) {
            emptyFiles.push({
              id: sourceNode.id,
              label: (data.label as string) || "文件上传",
            });
          }
        }
      }

      // 检测提示词输入
      if (targetHandle === "input-prompt" || (!targetHandle && sourceNode.type === "promptNode")) {
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string; label?: string };
          if (!data.prompt || data.prompt.trim() === "") {
            emptyPrompts.push({
              id: sourceNode.id,
              label: (data.label as string) || "提示词",
            });
          }
        } else if (sourceNode.type === "llmContentNode") {
          const data = sourceNode.data as { outputContent?: string; label?: string };
          if (!data.outputContent || data.outputContent.trim() === "") {
            emptyPrompts.push({
              id: sourceNode.id,
              label: (data.label as string) || "LLM 内容",
            });
          }
        }
      }
    }

    return { emptyImages, emptyFiles, emptyPrompts };
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
