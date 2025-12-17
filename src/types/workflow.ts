/**
 * 工作流编排相关类型定义
 */

// 工作流执行状态
export type WorkflowStatus = "idle" | "running" | "paused" | "completed" | "error";

// 节点执行状态
export type NodeExecutionStatus =
  | "pending"    // 等待执行
  | "ready"      // 依赖已就绪，准备执行
  | "running"    // 执行中
  | "completed"  // 执行完成
  | "failed"     // 执行失败
  | "skipped";   // 已跳过（上游失败导致）

// 节点执行结果
export interface NodeExecutionResult {
  success: boolean;
  error?: string;
  output?: unknown;
}

// 工作流执行上下文
export interface WorkflowExecutionContext {
  status: WorkflowStatus;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  errors: Record<string, string>;
  progress: {
    completed: number;
    total: number;
  };
}

// 工作流引擎配置
export interface WorkflowEngineConfig {
  maxParallelNodes?: number;  // 最大并行节点数，默认 3
  skipInputNodes?: boolean;   // 是否跳过输入节点，默认 true
}

// 状态变更回调
export type WorkflowStatusCallback = (context: WorkflowExecutionContext) => void;

// 可执行的节点类型（输入节点不需要执行）
export const EXECUTABLE_NODE_TYPES = [
  "imageGeneratorProNode",
  "imageGeneratorFastNode",
  "llmContentNode",
  "videoGeneratorNode",
  "pptContentNode",
] as const;

// 输入节点类型（无需执行，只提供数据）
export const INPUT_NODE_TYPES = [
  "promptNode",
  "imageInputNode",
  "fileUploadNode",
] as const;

// 跳过执行的节点类型
export const SKIP_EXECUTION_NODE_TYPES = [
  "promptNode",
  "imageInputNode",
  "fileUploadNode",
  "pptAssemblerNode",  // PPT 组装节点无自动执行逻辑
] as const;

// 判断节点是否需要执行
export function isExecutableNode(nodeType: string): boolean {
  return (EXECUTABLE_NODE_TYPES as readonly string[]).includes(nodeType);
}

// 判断节点是否应该跳过
export function shouldSkipNode(nodeType: string): boolean {
  return (SKIP_EXECUTION_NODE_TYPES as readonly string[]).includes(nodeType);
}
