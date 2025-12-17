/**
 * 工作流引擎
 * 负责拓扑排序、依赖解析、并行执行控制
 */

import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "@/types";
import type {
  WorkflowExecutionContext,
  WorkflowEngineConfig,
  WorkflowStatusCallback,
} from "@/types/workflow";
import { shouldSkipNode } from "@/types/workflow";
import { nodeExecutor } from "./nodeExecutor";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";

// 自定义节点类型
type CustomNode = Node<CustomNodeData>;

/**
 * 工作流引擎类
 */
export class WorkflowEngine {
  private config: WorkflowEngineConfig;
  private context: WorkflowExecutionContext;
  private abortController: AbortController;
  private isPaused: boolean = false;
  private pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;
  private statusCallbacks: Set<WorkflowStatusCallback> = new Set();

  // 当前执行的节点和边（用于部分执行）
  private currentNodes: CustomNode[] = [];
  private currentEdges: Edge[] = [];
  private canvasId: string = "";

  constructor(config?: WorkflowEngineConfig) {
    this.config = {
      maxParallelNodes: config?.maxParallelNodes ?? 3,
      skipInputNodes: config?.skipInputNodes ?? true,
    };

    this.context = this.createInitialContext();
    this.abortController = new AbortController();
  }

  /**
   * 创建初始执行上下文
   */
  private createInitialContext(): WorkflowExecutionContext {
    return {
      status: "idle",
      nodeStatuses: {},
      errors: {},
      progress: { completed: 0, total: 0 },
    };
  }

  /**
   * 重置执行状态
   */
  private reset(): void {
    this.context = this.createInitialContext();
    this.abortController = new AbortController();
    this.isPaused = false;
    this.pausePromise = null;
    this.pauseResolve = null;
  }

  /**
   * 通知状态变更
   */
  private notifyStatusChange(): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback({ ...this.context });
      } catch (e) {
        console.error("[WorkflowEngine] Status callback error:", e);
      }
    });
  }

  /**
   * 订阅状态变更
   */
  onStatusChange(callback: WorkflowStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * 获取当前执行状态
   */
  getStatus(): WorkflowExecutionContext {
    return { ...this.context };
  }

  /**
   * 检测图中是否存在循环依赖
   * 使用 DFS + 颜色标记法
   * 返回: { hasCycle: boolean, cycleNodes: string[] }
   */
  private detectCycle(nodes: CustomNode[], edges: Edge[]): { hasCycle: boolean; cycleNodes: string[] } {
    const WHITE = 0; // 未访问
    const GRAY = 1;  // 正在访问（在当前 DFS 路径上）
    const BLACK = 2; // 已完成访问

    const color = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // 初始化
    nodes.forEach((node) => {
      color.set(node.id, WHITE);
      adjacencyList.set(node.id, []);
    });

    edges.forEach((edge) => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source)!.push(edge.target);
      }
    });

    const cycleNodes: string[] = [];
    let hasCycle = false;

    const dfs = (nodeId: string, path: string[]): boolean => {
      color.set(nodeId, GRAY);
      path.push(nodeId);

      for (const neighbor of adjacencyList.get(nodeId) || []) {
        if (!color.has(neighbor)) continue; // 边指向不存在的节点，跳过

        if (color.get(neighbor) === GRAY) {
          // 发现循环：从当前路径中找到循环部分
          hasCycle = true;
          const cycleStart = path.indexOf(neighbor);
          cycleNodes.push(...path.slice(cycleStart));
          return true;
        }

        if (color.get(neighbor) === WHITE) {
          if (dfs(neighbor, path)) return true;
        }
      }

      color.set(nodeId, BLACK);
      path.pop();
      return false;
    };

    // 对所有未访问的节点执行 DFS
    for (const node of nodes) {
      if (color.get(node.id) === WHITE) {
        if (dfs(node.id, [])) break;
      }
    }

    return { hasCycle, cycleNodes: [...new Set(cycleNodes)] };
  }

  /**
   * 拓扑排序 - 确定节点执行顺序
   * 返回分层的节点 ID 数组，每层节点可并行执行
   * 如果检测到循环依赖，会抛出错误
   */
  private topologicalSort(nodes: CustomNode[], edges: Edge[]): string[][] {
    // 先检测循环依赖
    const cycleResult = this.detectCycle(nodes, edges);
    if (cycleResult.hasCycle) {
      const cycleNodeNames = cycleResult.cycleNodes
        .map((id) => {
          const node = nodes.find((n) => n.id === id);
          return (node?.data as { label?: string })?.label || id.slice(0, 6);
        })
        .join(" → ");
      throw new Error(`检测到循环依赖: ${cycleNodeNames}，请检查节点连接`);
    }

    // 构建邻接表和入度表
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((node) => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach((edge) => {
      if (adjacencyList.has(edge.source) && inDegree.has(edge.target)) {
        adjacencyList.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
      }
    });

    // 按层级进行拓扑排序
    const layers: string[][] = [];
    const visited = new Set<string>();

    // 找出所有入度为 0 的节点作为第一层
    let currentLayer = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach((id) => visited.add(id));

      // 计算下一层
      const nextLayer: string[] = [];
      currentLayer.forEach((nodeId) => {
        adjacencyList.get(nodeId)?.forEach((targetId) => {
          if (visited.has(targetId)) return;

          // 检查该节点的所有前置节点是否都已访问
          const allPredecessorsVisited = edges
            .filter((e) => e.target === targetId)
            .every((e) => visited.has(e.source));

          if (allPredecessorsVisited && !nextLayer.includes(targetId)) {
            nextLayer.push(targetId);
          }
        });
      });

      currentLayer = nextLayer;
    }

    // 处理真正的孤立节点（没有任何连接的节点）
    const unvisitedNodes = nodes.filter((n) => !visited.has(n.id));
    if (unvisitedNodes.length > 0) {
      // 孤立节点应该是没有任何连接的节点
      const isolatedNodes = unvisitedNodes.filter((n) => {
        const hasIncoming = edges.some((e) => e.target === n.id);
        const hasOutgoing = edges.some((e) => e.source === n.id);
        return !hasIncoming && !hasOutgoing;
      });
      if (isolatedNodes.length > 0) {
        layers.push(isolatedNodes.map((n) => n.id));
      }
    }

    return layers;
  }

  /**
   * 获取指定节点及其所有下游节点
   */
  private getDownstreamNodes(startNodeId: string, _nodes: CustomNode[], edges: Edge[]): Set<string> {
    const result = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (result.has(currentId)) continue;
      result.add(currentId);

      // 找到所有以当前节点为源的边
      edges
        .filter((e) => e.source === currentId)
        .forEach((e) => {
          if (!result.has(e.target)) {
            queue.push(e.target);
          }
        });
    }

    return result;
  }

  /**
   * 标记失败节点的所有下游为 skipped
   * 同时更新进度（skipped 节点也计入已处理）
   */
  private markDownstreamAsSkipped(nodeId: string): void {
    const downstreamNodes = this.getDownstreamNodes(nodeId, this.currentNodes, this.currentEdges);

    downstreamNodes.forEach((id) => {
      if (id !== nodeId && this.context.nodeStatuses[id] === "pending") {
        this.context.nodeStatuses[id] = "skipped";
        // skipped 节点也计入进度（表示已处理，虽然没有实际执行）
        this.incrementProgress();
      }
    });
  }

  /**
   * 重置节点的 UI 状态
   * 在工作流开始前清除之前的错误状态
   */
  private resetNodeUIStatuses(nodeIds: string[]): void {
    const { activeCanvasId } = useCanvasStore.getState();
    const { updateNodeData } = useFlowStore.getState();

    // 如果是当前活跃画布，通过 flowStore 更新
    if (this.canvasId === activeCanvasId) {
      nodeIds.forEach((nodeId) => {
        updateNodeData(nodeId, { status: "idle", error: undefined });
      });
    } else {
      // 否则更新 canvasStore
      const canvasStore = useCanvasStore.getState();
      const canvas = canvasStore.canvases.find((c) => c.id === this.canvasId);
      if (canvas) {
        const updatedNodes = canvas.nodes.map((node) => {
          if (nodeIds.includes(node.id)) {
            return { ...node, data: { ...node.data, status: "idle", error: undefined } };
          }
          return node;
        });
        useCanvasStore.setState((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === this.canvasId ? { ...c, nodes: updatedNodes, updatedAt: Date.now() } : c
          ),
        }));
      }
    }
  }

  /**
   * 检查节点的上游依赖是否有有效数据
   * 用于 executeFromNode 时验证起始条件
   */
  private checkUpstreamDataAvailable(nodeId: string): { valid: boolean; missingInputs: string[] } {
    const node = this.currentNodes.find((n) => n.id === nodeId);
    if (!node) return { valid: false, missingInputs: ["节点不存在"] };

    const nodeType = node.type;
    if (!nodeType || shouldSkipNode(nodeType)) {
      return { valid: true, missingInputs: [] };
    }

    const missingInputs: string[] = [];

    // 获取上游连接
    const incomingEdges = this.currentEdges.filter((e) => e.target === nodeId);

    // 检查 prompt 输入
    const promptEdge = incomingEdges.find((e) => e.targetHandle === "input-prompt" || !e.targetHandle);
    if (promptEdge) {
      const sourceNode = this.currentNodes.find((n) => n.id === promptEdge.source);
      if (sourceNode) {
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          if (!data.prompt?.trim()) {
            missingInputs.push("提示词为空");
          }
        } else if (sourceNode.type === "llmContentNode") {
          const data = sourceNode.data as { outputContent?: string };
          if (!data.outputContent?.trim()) {
            missingInputs.push("LLM 输出为空（请先执行上游 LLM 节点）");
          }
        }
      }
    } else {
      // 需要 prompt 输入的节点类型
      const needsPrompt = ["imageGeneratorProNode", "imageGeneratorFastNode", "videoGeneratorNode", "llmContentNode"];
      if (needsPrompt.includes(nodeType)) {
        missingInputs.push("缺少提示词连接");
      }
    }

    return {
      valid: missingInputs.length === 0,
      missingInputs,
    };
  }

  /**
   * 原子性更新进度
   */
  private incrementProgress(): void {
    this.context.progress.completed = this.context.progress.completed + 1;
  }

  /**
   * 等待暂停恢复
   */
  private async waitForResume(): Promise<void> {
    if (!this.isPaused) return;

    this.pausePromise = new Promise<void>((resolve) => {
      this.pauseResolve = resolve;
    });

    await this.pausePromise;
  }

  /**
   * 执行单个节点
   */
  private async executeNode(nodeId: string): Promise<boolean> {
    // 检查是否被取消
    if (this.abortController.signal.aborted) {
      return false;
    }

    // 等待暂停恢复
    await this.waitForResume();

    // 再次检查取消（暂停期间可能被取消）
    if (this.abortController.signal.aborted) {
      return false;
    }

    const node = this.currentNodes.find((n) => n.id === nodeId);
    if (!node) {
      console.warn(`[WorkflowEngine] 节点未找到: ${nodeId}`);
      return true;
    }

    // 检查是否应该跳过
    if (node.type && shouldSkipNode(node.type)) {
      this.context.nodeStatuses[nodeId] = "completed";
      return true;
    }

    // 更新状态为执行中
    this.context.nodeStatuses[nodeId] = "running";
    this.notifyStatusChange();

    try {
      const result = await nodeExecutor.executeNode(
        node,
        this.canvasId,
        this.abortController.signal
      );

      if (result.success) {
        this.context.nodeStatuses[nodeId] = "completed";
      } else {
        this.context.nodeStatuses[nodeId] = "failed";
        this.context.errors[nodeId] = result.error || "执行失败";
        // 标记下游节点为跳过
        this.markDownstreamAsSkipped(nodeId);
      }

      // 无论成功失败都计入进度（表示该节点已处理）
      this.incrementProgress();

      this.notifyStatusChange();
      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "执行失败";
      this.context.nodeStatuses[nodeId] = "failed";
      this.context.errors[nodeId] = errorMessage;
      this.markDownstreamAsSkipped(nodeId);
      // 异常情况也计入进度
      this.incrementProgress();
      this.notifyStatusChange();
      return false;
    }
  }

  /**
   * 执行一层节点（带并发控制）
   * 使用信号量模式避免竞态条件
   */
  private async executeLayer(layerNodeIds: string[]): Promise<void> {
    const maxParallel = this.config.maxParallelNodes || 3;

    // 过滤掉已经被标记为 skipped 的节点
    const nodesToExecute = layerNodeIds.filter(
      (id) => this.context.nodeStatuses[id] !== "skipped"
    );

    if (nodesToExecute.length === 0) return;

    // 使用信号量模式进行并发控制
    // 支持多个等待者的队列
    let runningCount = 0;
    const waitingResolvers: (() => void)[] = [];

    const waitForSlot = async (): Promise<void> => {
      if (runningCount < maxParallel) return;
      // 加入等待队列
      await new Promise<void>((resolve) => {
        waitingResolvers.push(resolve);
      });
    };

    const releaseSlot = (): void => {
      runningCount--;
      // 唤醒队列中的下一个等待者
      if (waitingResolvers.length > 0) {
        const nextResolve = waitingResolvers.shift()!;
        nextResolve();
      }
    };

    const allPromises: Promise<boolean>[] = [];

    for (const nodeId of nodesToExecute) {
      // 检查是否被取消
      if (this.abortController.signal.aborted) break;

      // 等待有空闲槽位
      await waitForSlot();

      // 再次检查取消状态（等待期间可能被取消）
      if (this.abortController.signal.aborted) break;

      runningCount++;

      const promise = this.executeNode(nodeId).finally(() => {
        releaseSlot();
      });

      allPromises.push(promise);
    }

    // 等待所有已启动的节点完成
    await Promise.all(allPromises);
  }

  /**
   * 执行整个工作流
   */
  async executeWorkflow(
    nodes: CustomNode[],
    edges: Edge[],
    canvasId: string
  ): Promise<WorkflowExecutionContext> {
    this.reset();
    this.currentNodes = nodes;
    this.currentEdges = edges;
    this.canvasId = canvasId;

    // 过滤需要执行的节点（排除输入节点等）
    const executableNodes = nodes.filter((n) => !n.type || !shouldSkipNode(n.type));
    const executableNodeIds = executableNodes.map((n) => n.id);

    // 重置节点 UI 状态，清除之前的错误
    this.resetNodeUIStatuses(executableNodeIds);

    // 初始化节点状态
    executableNodes.forEach((node) => {
      this.context.nodeStatuses[node.id] = "pending";
    });
    this.context.progress.total = executableNodes.length;
    this.context.status = "running";
    this.notifyStatusChange();

    try {
      // 拓扑排序（会检测循环依赖）
      const layers = this.topologicalSort(nodes, edges);

      // 按层执行
      for (const layer of layers) {
        // 检查是否被取消
        if (this.abortController.signal.aborted) {
          this.context.status = "idle";
          break;
        }

        // 过滤出需要执行的节点（排除输入节点）
        const executableLayerNodes = layer.filter(
          (id) => this.context.nodeStatuses[id] !== undefined
        );

        if (executableLayerNodes.length > 0) {
          await this.executeLayer(executableLayerNodes);
        }
      }

      // 确定最终状态
      if (this.abortController.signal.aborted) {
        this.context.status = "idle";
      } else {
        const hasErrors = Object.keys(this.context.errors).length > 0;
        this.context.status = hasErrors ? "error" : "completed";
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "执行失败";
      this.context.status = "error";
      // 将错误信息保存到特殊的 key，用于显示全局错误
      this.context.errors["__workflow__"] = errorMessage;
      console.error("[WorkflowEngine] 执行错误:", error);
    }

    this.notifyStatusChange();
    return this.getStatus();
  }

  /**
   * 从指定节点开始执行（部分执行）
   */
  async executeFromNode(
    startNodeId: string,
    nodes: CustomNode[],
    edges: Edge[],
    canvasId: string
  ): Promise<WorkflowExecutionContext> {
    this.reset();
    this.currentNodes = nodes;
    this.currentEdges = edges;
    this.canvasId = canvasId;

    // 检查起始节点的上游数据是否可用
    const upstreamCheck = this.checkUpstreamDataAvailable(startNodeId);
    if (!upstreamCheck.valid) {
      this.context.status = "error";
      this.context.errors[startNodeId] = upstreamCheck.missingInputs.join("; ");
      this.notifyStatusChange();
      return this.getStatus();
    }

    // 获取起始节点及其所有下游节点
    const targetNodeIds = this.getDownstreamNodes(startNodeId, nodes, edges);

    // 过滤需要执行的节点
    const executableNodes = nodes.filter(
      (n) => targetNodeIds.has(n.id) && (!n.type || !shouldSkipNode(n.type))
    );
    const executableNodeIds = executableNodes.map((n) => n.id);

    // 重置节点 UI 状态，清除之前的错误
    this.resetNodeUIStatuses(executableNodeIds);

    // 初始化节点状态
    executableNodes.forEach((node) => {
      this.context.nodeStatuses[node.id] = "pending";
    });
    this.context.progress.total = executableNodes.length;
    this.context.status = "running";
    this.notifyStatusChange();

    try {
      // 对目标节点进行拓扑排序（会检测循环依赖）
      const targetNodes = nodes.filter((n) => targetNodeIds.has(n.id));
      const targetEdges = edges.filter(
        (e) => targetNodeIds.has(e.source) && targetNodeIds.has(e.target)
      );
      const layers = this.topologicalSort(targetNodes, targetEdges);

      // 按层执行
      for (const layer of layers) {
        if (this.abortController.signal.aborted) {
          this.context.status = "idle";
          break;
        }

        const executableLayerNodes = layer.filter(
          (id) => this.context.nodeStatuses[id] !== undefined
        );

        if (executableLayerNodes.length > 0) {
          await this.executeLayer(executableLayerNodes);
        }
      }

      // 确定最终状态
      if (this.abortController.signal.aborted) {
        this.context.status = "idle";
      } else {
        const hasErrors = Object.keys(this.context.errors).length > 0;
        this.context.status = hasErrors ? "error" : "completed";
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "执行失败";
      this.context.status = "error";
      // 将错误信息保存到特殊的 key，用于显示全局错误
      this.context.errors["__workflow__"] = errorMessage;
      console.error("[WorkflowEngine] 执行错误:", error);
    }

    this.notifyStatusChange();
    return this.getStatus();
  }

  /**
   * 暂停执行
   */
  pause(): void {
    if (this.context.status !== "running") return;

    this.isPaused = true;
    this.context.status = "paused";
    this.notifyStatusChange();
  }

  /**
   * 恢复执行
   */
  resume(): void {
    if (this.context.status !== "paused") return;

    this.isPaused = false;
    this.context.status = "running";
    this.notifyStatusChange();

    // 解除暂停等待
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this.abortController.abort();
    this.isPaused = false;

    // 解除暂停等待（如果有）
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }

    this.context.status = "idle";
    this.notifyStatusChange();
  }
}

// 导出单例（可选，也可以每次创建新实例）
export const workflowEngine = new WorkflowEngine();
