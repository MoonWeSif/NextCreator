/**
 * 全局任务管理器
 * 用于管理跨画布的异步任务（如视频生成、图片生成等）
 * 解决画布切换时轮询状态丢失的问题
 */

import { invoke } from "@tauri-apps/api/core";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { VideoGeneratorNodeData } from "@/types";
import { pollVideoTask, type VideoProgressInfo } from "./videoGeneration";
import type { VeoGeneratorNodeData } from "@/components/nodes/VeoGeneratorNode";

// 任务状态
export type TaskStatus = "running" | "completed" | "failed" | "cancelled";

// 任务信息
export interface TaskInfo {
  taskId: string;
  nodeId: string;
  canvasId: string;
  type: "video" | "image" | "veo";
  status: TaskStatus;
  progress: number;
  stage?: string;
  error?: string;
  startTime: number;
}

// 任务管理器类
class TaskManager {
  // 存储所有正在进行的任务
  private tasks: Map<string, TaskInfo> = new Map();
  // 存储任务的取消函数
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * 注册一个视频生成任务
   */
  registerVideoTask(
    taskId: string,
    nodeId: string,
    canvasId: string
  ): void {
    const taskKey = this.getTaskKey(nodeId, canvasId);

    // 如果已有相同的任务，先取消
    this.cancelTask(nodeId, canvasId);

    const taskInfo: TaskInfo = {
      taskId,
      nodeId,
      canvasId,
      type: "video",
      status: "running",
      progress: 0,
      stage: "queued",
      startTime: Date.now(),
    };

    this.tasks.set(taskKey, taskInfo);

    // 创建 AbortController
    const abortController = new AbortController();
    this.abortControllers.set(taskKey, abortController);

    // 开始轮询
    this.startPolling(taskKey, taskId, abortController.signal);
  }

  /**
   * 注册一个 Veo 视频生成任务
   */
  registerVeoTask(
    taskId: string,
    nodeId: string,
    canvasId: string
  ): void {
    const taskKey = this.getTaskKey(nodeId, canvasId);

    // 如果已有相同的任务，先取消
    this.cancelTask(nodeId, canvasId);

    const taskInfo: TaskInfo = {
      taskId,
      nodeId,
      canvasId,
      type: "veo",
      status: "running",
      progress: 0,
      stage: "queued",
      startTime: Date.now(),
    };

    this.tasks.set(taskKey, taskInfo);

    // 创建 AbortController
    const abortController = new AbortController();
    this.abortControllers.set(taskKey, abortController);

    // 开始 Veo 轮询
    this.startVeoPolling(taskKey, taskId, abortController.signal);
  }

  /**
   * 开始轮询任务状态
   */
  private async startPolling(
    taskKey: string,
    taskId: string,
    signal: AbortSignal
  ): Promise<void> {
    const task = this.tasks.get(taskKey);
    if (!task) return;

    try {
      await pollVideoTask(
        taskId,
        (info: VideoProgressInfo) => {
          // 检查是否已取消
          if (signal.aborted) return;

          // 更新任务信息
          this.updateTask(taskKey, {
            progress: info.progress,
            stage: info.stage,
            status: info.stage === "completed" ? "completed" :
                   info.stage === "failed" ? "failed" : "running",
          });

          // 同步更新到节点数据（无论当前是否在该画布）
          this.syncToNode(taskKey, info);
        }
      );

      // 轮询完成后更新状态
      if (!signal.aborted) {
        const updatedTask = this.tasks.get(taskKey);
        if (updatedTask && updatedTask.status === "running") {
          this.updateTask(taskKey, { status: "completed", progress: 100 });
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : "任务失败";
        this.updateTask(taskKey, { status: "failed", error: errorMessage });

        // 同步错误状态到节点
        const task = this.tasks.get(taskKey);
        if (task) {
          this.syncErrorToNode(task, errorMessage);
        }
      }
    }
  }

  /**
   * 开始 Veo 任务轮询
   */
  private async startVeoPolling(
    taskKey: string,
    taskId: string,
    signal: AbortSignal
  ): Promise<void> {
    const task = this.tasks.get(taskKey);
    if (!task) return;

    // 获取供应商配置
    const { settings } = useSettingsStore.getState();
    const providerId = settings.nodeProviders.veoGenerator;
    const provider = settings.providers.find((p) => p.id === providerId);

    if (!provider) {
      this.updateTask(taskKey, { status: "failed", error: "未配置供应商" });
      this.syncErrorToVeoNode(task, "未配置供应商");
      return;
    }

    const maxAttempts = 120; // 最多轮询 10 分钟
    const interval = 5000;   // 5秒间隔
    let attempts = 0;

    try {
      while (attempts < maxAttempts) {
        // 检查是否被取消
        if (signal.aborted) {
          return;
        }

        // 调用 Veo 状态查询
        const result = await invoke<{ success: boolean; taskId?: string; status?: string; progress?: number; error?: string }>("veo_get_status", {
          params: {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            taskId,
          },
        });

        if (!result.success && result.error) {
          this.updateTask(taskKey, { status: "failed", error: result.error });
          this.syncErrorToVeoNode(task, result.error);
          return;
        }

        const stage = result.status || "queued";
        const progress = result.progress || 0;

        // 更新任务信息
        this.updateTask(taskKey, {
          progress,
          stage,
          status: stage === "completed" ? "completed" :
                 stage === "failed" || stage === "failure" ? "failed" : "running",
        });

        // 同步更新到节点
        this.syncToVeoNode(taskKey, {
          progress,
          stage: stage as "queued" | "in_progress" | "completed" | "failed",
          taskId,
        });

        // 检查是否完成
        if (stage === "completed") {
          this.updateTask(taskKey, { status: "completed", progress: 100 });
          return;
        }

        if (stage === "failed" || stage === "failure") {
          this.updateTask(taskKey, { status: "failed", error: result.error || "生成失败" });
          this.syncErrorToVeoNode(task, result.error || "生成失败");
          return;
        }

        // 等待后继续轮询
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, interval);
          if (signal) {
            const onAbort = () => {
              clearTimeout(timeoutId);
              resolve();
            };
            signal.addEventListener("abort", onAbort, { once: true });
          }
        });
        attempts++;
      }

      // 超时
      this.updateTask(taskKey, { status: "failed", error: "任务超时" });
      this.syncErrorToVeoNode(task, "任务超时");

    } catch (error) {
      if (!signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : "任务失败";
        this.updateTask(taskKey, { status: "failed", error: errorMessage });
        this.syncErrorToVeoNode(task, errorMessage);
      }
    }
  }

  /**
   * 同步进度到节点数据
   */
  private syncToNode(taskKey: string, info: VideoProgressInfo): void {
    const task = this.tasks.get(taskKey);
    if (!task) return;

    const { activeCanvasId } = useCanvasStore.getState();
    const { updateNodeData } = useFlowStore.getState();

    // 如果当前在该任务所属的画布，直接更新 flowStore
    if (activeCanvasId === task.canvasId) {
      updateNodeData<VideoGeneratorNodeData>(task.nodeId, {
        progress: info.progress,
        taskStage: info.stage,
        taskId: info.taskId,
        status: info.stage === "completed" ? "success" :
               info.stage === "failed" ? "error" : "loading",
      });
    }

    // 同时更新 canvasStore 中的数据（确保切换回来时数据正确）
    this.updateCanvasNodeData(task.canvasId, task.nodeId, {
      progress: info.progress,
      taskStage: info.stage,
      taskId: info.taskId,
      status: info.stage === "completed" ? "success" :
             info.stage === "failed" ? "error" : "loading",
    });
  }

  /**
   * 同步进度到 Veo 节点数据
   */
  private syncToVeoNode(taskKey: string, info: VideoProgressInfo): void {
    const task = this.tasks.get(taskKey);
    if (!task) return;

    const { activeCanvasId } = useCanvasStore.getState();
    const { updateNodeData } = useFlowStore.getState();

    const nodeUpdate: Partial<VeoGeneratorNodeData> = {
      progress: info.progress,
      taskStage: info.stage,
      taskId: info.taskId,
      status: info.stage === "completed" ? "success" :
             info.stage === "failed" ? "error" : "loading",
    };

    // 如果当前在该任务所属的画布，直接更新 flowStore
    if (activeCanvasId === task.canvasId) {
      updateNodeData<VeoGeneratorNodeData>(task.nodeId, nodeUpdate);
    }

    // 同时更新 canvasStore 中的数据
    this.updateCanvasNodeData(task.canvasId, task.nodeId, nodeUpdate);
  }

  /**
   * 同步错误状态到节点
   */
  private syncErrorToNode(task: TaskInfo, error: string): void {
    const { activeCanvasId } = useCanvasStore.getState();
    const { updateNodeData } = useFlowStore.getState();

    if (activeCanvasId === task.canvasId) {
      updateNodeData<VideoGeneratorNodeData>(task.nodeId, {
        status: "error",
        error,
        taskStage: "failed",
      });
    }

    this.updateCanvasNodeData(task.canvasId, task.nodeId, {
      status: "error",
      error,
      taskStage: "failed",
    });
  }

  /**
   * 同步错误状态到 Veo 节点
   */
  private syncErrorToVeoNode(task: TaskInfo, error: string): void {
    const { activeCanvasId } = useCanvasStore.getState();
    const { updateNodeData } = useFlowStore.getState();

    const nodeUpdate: Partial<VeoGeneratorNodeData> = {
      status: "error",
      error,
      taskStage: "failed",
    };

    if (activeCanvasId === task.canvasId) {
      updateNodeData<VeoGeneratorNodeData>(task.nodeId, nodeUpdate);
    }

    this.updateCanvasNodeData(task.canvasId, task.nodeId, nodeUpdate);
  }

  /**
   * 更新 canvasStore 中特定画布的节点数据
   */
  private updateCanvasNodeData(
    canvasId: string,
    nodeId: string,
    data: Partial<VideoGeneratorNodeData | VeoGeneratorNodeData>
  ): void {
    const canvasStore = useCanvasStore.getState();
    const canvas = canvasStore.canvases.find(c => c.id === canvasId);

    if (!canvas) return;

    const updatedNodes = canvas.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, ...data },
        };
      }
      return node;
    });

    // 直接更新 canvasStore 中的画布数据
    useCanvasStore.setState(state => ({
      canvases: state.canvases.map(c =>
        c.id === canvasId
          ? { ...c, nodes: updatedNodes, updatedAt: Date.now() }
          : c
      ),
    }));
  }

  /**
   * 更新任务信息
   */
  private updateTask(taskKey: string, updates: Partial<TaskInfo>): void {
    const task = this.tasks.get(taskKey);
    if (task) {
      this.tasks.set(taskKey, { ...task, ...updates });
    }
  }

  /**
   * 取消任务
   */
  cancelTask(nodeId: string, canvasId: string): void {
    const taskKey = this.getTaskKey(nodeId, canvasId);

    const abortController = this.abortControllers.get(taskKey);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(taskKey);
    }

    const task = this.tasks.get(taskKey);
    if (task) {
      this.updateTask(taskKey, { status: "cancelled" });
      this.tasks.delete(taskKey);
    }
  }

  /**
   * 获取任务信息
   */
  getTask(nodeId: string, canvasId: string): TaskInfo | undefined {
    const taskKey = this.getTaskKey(nodeId, canvasId);
    return this.tasks.get(taskKey);
  }

  /**
   * 检查节点是否有正在运行的任务
   */
  isTaskRunning(nodeId: string, canvasId: string): boolean {
    const task = this.getTask(nodeId, canvasId);
    return task?.status === "running";
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TaskInfo[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取指定画布的所有任务
   */
  getTasksByCanvas(canvasId: string): TaskInfo[] {
    return Array.from(this.tasks.values()).filter(t => t.canvasId === canvasId);
  }

  /**
   * 生成任务唯一键
   */
  private getTaskKey(nodeId: string, canvasId: string): string {
    return `${canvasId}:${nodeId}`;
  }

  /**
   * 清理已完成/失败的任务
   */
  cleanupCompletedTasks(): void {
    for (const [key, task] of this.tasks.entries()) {
      if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        this.tasks.delete(key);
        this.abortControllers.delete(key);
      }
    }
  }
}

// 导出单例
export const taskManager = new TaskManager();
