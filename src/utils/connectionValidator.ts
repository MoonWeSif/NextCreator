/**
 * 连接验证工具
 * 用于验证节点之间的连接是否合法
 */

import type { Edge, Node, Connection } from "@xyflow/react";
import { nodeCategories } from "@/config/nodeConfig";

// Handle 类型定义
export type HandleType = "prompt" | "image" | "video" | "data" | "results" | "text" | "file";

// 节点的输入输出配置映射
interface NodeIOConfig {
  inputs: HandleType[];
  outputs: HandleType[];
}

// 从 nodeConfig 构建节点IO配置映射
const nodeIOConfigMap: Record<string, NodeIOConfig> = {};

// 初始化配置映射
nodeCategories.forEach((category) => {
  category.nodes.forEach((nodeDef) => {
    nodeIOConfigMap[nodeDef.type] = {
      inputs: (nodeDef.inputs || []) as HandleType[],
      outputs: (nodeDef.outputs || []) as HandleType[],
    };
  });
});

/**
 * 获取节点的IO配置
 */
export function getNodeIOConfig(nodeType: string): NodeIOConfig | undefined {
  return nodeIOConfigMap[nodeType];
}

/**
 * 获取节点的输出类型
 */
export function getNodeOutputType(nodeType: string): HandleType | undefined {
  const config = nodeIOConfigMap[nodeType];
  return config?.outputs[0]; // 目前每个节点只有一个输出类型
}

/**
 * 获取节点的输入类型列表
 */
export function getNodeInputTypes(nodeType: string): HandleType[] {
  const config = nodeIOConfigMap[nodeType];
  return config?.inputs || [];
}

/**
 * 检查类型是否兼容
 * prompt 只能连 prompt 输入
 * image 可以连 image 输入
 * video 可以连 video 输入（如果未来有的话）
 */
export function areTypesCompatible(
  sourceType: HandleType,
  targetInputTypes: HandleType[]
): boolean {
  return targetInputTypes.includes(sourceType);
}

/**
 * 检测是否存在循环引用
 * 使用 DFS 检测从 targetId 是否可以到达 sourceId
 */
export function wouldCreateCycle(
  edges: Edge[],
  sourceId: string,
  targetId: string
): boolean {
  // 构建邻接表（从 target 到 source 的反向图）
  const reverseGraph = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!reverseGraph.has(edge.target)) {
      reverseGraph.set(edge.target, []);
    }
    reverseGraph.get(edge.target)!.push(edge.source);
  });

  // 从 sourceId 开始 DFS，看是否能到达 targetId
  const visited = new Set<string>();
  const stack = [sourceId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === targetId) {
      return true; // 会形成循环
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const predecessors = reverseGraph.get(current) || [];
    for (const pred of predecessors) {
      if (!visited.has(pred)) {
        stack.push(pred);
      }
    }
  }

  return false;
}

/**
 * 检查是否已存在相同的连接
 */
export function connectionExists(
  edges: Edge[],
  sourceId: string,
  targetId: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): boolean {
  return edges.some(
    (edge) =>
      edge.source === sourceId &&
      edge.target === targetId &&
      edge.sourceHandle === sourceHandle &&
      edge.targetHandle === targetHandle
  );
}

/**
 * 检查目标 Handle 是否已有连接（单输入限制）
 * @param edges 现有边列表
 * @param targetId 目标节点ID
 * @param targetHandle Handle ID（用于区分不同输入端口）
 * @returns 是否已有连接
 */
export function targetHandleHasConnection(
  edges: Edge[],
  targetId: string,
  targetHandle?: string | null
): boolean {
  return edges.some(
    (edge) =>
      edge.target === targetId && edge.targetHandle === targetHandle
  );
}

/**
 * 获取连接到目标节点特定 Handle 的现有边
 */
export function getExistingConnectionToHandle(
  edges: Edge[],
  targetId: string,
  targetHandle?: string | null
): Edge | undefined {
  return edges.find(
    (edge) =>
      edge.target === targetId && edge.targetHandle === targetHandle
  );
}

// 连接验证结果
export interface ConnectionValidationResult {
  isValid: boolean;
  reason?: string;
  existingEdge?: Edge; // 如果存在已有连接，返回该边（用于替换）
}

/**
 * 综合验证连接是否合法
 */
export function validateConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): ConnectionValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection;

  // 1. 基本检查：不能自连接
  if (source === target) {
    return { isValid: false, reason: "不能连接到自身" };
  }

  // 2. 找到源节点和目标节点
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return { isValid: false, reason: "节点不存在" };
  }

  // 3. 获取源节点的输出类型
  const sourceOutputType = getNodeOutputType(sourceNode.type || "");
  if (!sourceOutputType) {
    return { isValid: false, reason: "源节点没有输出" };
  }

  // 4. 获取目标节点的输入类型
  const targetInputTypes = getNodeInputTypes(targetNode.type || "");
  if (targetInputTypes.length === 0) {
    return { isValid: false, reason: "目标节点没有输入" };
  }

  // 5. 检查类型兼容性
  // 如果有 targetHandle，用它来确定期望的输入类型
  // 否则检查源类型是否在目标接受的类型中
  if (targetHandle) {
    // targetHandle 格式: "input-prompt" 或 "input-image"
    const expectedType = targetHandle.replace("input-", "") as HandleType;
    if (sourceOutputType !== expectedType) {
      return {
        isValid: false,
        reason: `类型不匹配：${sourceOutputType} → ${expectedType}`,
      };
    }
  } else {
    // 没有指定 handle，检查是否兼容
    if (!areTypesCompatible(sourceOutputType, targetInputTypes)) {
      return {
        isValid: false,
        reason: `类型不匹配：${sourceOutputType} 不能连接到 ${targetInputTypes.join("/")} 输入`,
      };
    }
  }

  // 6. 检查循环引用
  if (wouldCreateCycle(edges, source!, target!)) {
    return { isValid: false, reason: "不能创建循环连接" };
  }

  // 7. 检查重复连接
  if (connectionExists(edges, source!, target!, sourceHandle, targetHandle)) {
    return { isValid: false, reason: "连接已存在" };
  }

  // 8. 检查单输入限制
  // - prompt 输入: 允许多个连接（会自动拼接）
  // - image 输入: ImageGenerator 和 PPTContent 允许多个，VideoGenerator 只允许一个
  const isMultiImageAllowed =
    targetNode.type === "imageGeneratorProNode" ||
    targetNode.type === "imageGeneratorFastNode" ||
    targetNode.type === "pptContentNode";

  const isImageInput = targetHandle === "input-image" ||
    (!targetHandle && sourceOutputType === "image");

  const isPromptInput = targetHandle === "input-prompt" ||
    (!targetHandle && sourceOutputType === "prompt");

  // 如果是 prompt 输入，允许多个连接（会自动拼接文本）
  if (isPromptInput) {
    return { isValid: true };
  }

  // 如果是允许多图的节点的 image 输入，直接允许连接
  if (isMultiImageAllowed && isImageInput) {
    return { isValid: true };
  }

  // 其他情况：检查是否需要替换现有连接
  const existingEdge = getExistingConnectionToHandle(
    edges,
    target!,
    targetHandle
  );

  if (existingEdge) {
    // 返回已存在的边，让调用者决定是否替换
    return {
      isValid: true,
      reason: "将替换现有连接",
      existingEdge,
    };
  }

  // 对于没有 targetHandle 的情况，检查是否已有同类型的输入
  if (!targetHandle) {
    const existingSameTypeConnection = edges.find((edge) => {
      if (edge.target !== target) return false;
      const edgeSourceNode = nodes.find((n) => n.id === edge.source);
      if (!edgeSourceNode) return false;
      const edgeSourceType = getNodeOutputType(edgeSourceNode.type || "");
      return edgeSourceType === sourceOutputType;
    });

    if (existingSameTypeConnection) {
      return {
        isValid: true,
        reason: "将替换现有连接",
        existingEdge: existingSameTypeConnection,
      };
    }
  }

  return { isValid: true };
}

/**
 * 用于 React Flow 的 isValidConnection 回调
 * 这是一个简化版本，用于连接预览时的快速验证
 */
export function createIsValidConnection(nodes: Node[], edges: Edge[]) {
  return (connection: Connection): boolean => {
    const result = validateConnection(connection, nodes, edges);
    return result.isValid;
  };
}
