/**
 * 视频生成框架 - 统一服务入口
 */

import { videoGenerationRegistry } from "./registry";
import { soraVideoProvider } from "./providers";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/toastStore";
import type {
  VideoGenerationRequest,
  VideoTaskResponse,
  VideoGenerationResponse,
  VideoProviderConfig,
  VideoNodeType,
  VideoProgressInfo,
  VideoTaskStage,
} from "./types";

/**
 * 初始化注册所有提供商
 */
export function initializeVideoGenerationProviders(): void {
  // 注册 Sora 提供商（OpenAI Video API 格式）
  videoGenerationRegistry.register(soraVideoProvider);

  console.log(
    "[VideoGenService] Providers initialized:",
    videoGenerationRegistry.getAll().map((p) => p.id)
  );
}

/**
 * 获取节点对应的供应商配置
 */
function getProviderConfig(nodeType: VideoNodeType): VideoProviderConfig {
  const { settings } = useSettingsStore.getState();
  const providerId = settings.nodeProviders[nodeType];

  if (!providerId) {
    throw new Error("请先在供应商管理中配置此节点的供应商");
  }

  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error("供应商不存在，请重新配置");
  }

  if (!provider.apiKey) {
    throw new Error("供应商 API Key 未配置");
  }

  return {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    protocol: provider.protocol,
    name: provider.name,
  };
}

/**
 * 创建视频任务（统一入口）
 */
export async function createVideoTask(
  request: VideoGenerationRequest,
  nodeType: VideoNodeType = "videoGenerator",
  abortSignal?: AbortSignal
): Promise<VideoTaskResponse> {
  try {
    const config = getProviderConfig(nodeType);

    // 根据协议获取对应的提供商实现
    const provider = videoGenerationRegistry.getByProtocol(config.protocol);

    if (!provider) {
      return {
        error: `不支持的协议类型: ${config.protocol}，请检查供应商配置`,
      };
    }

    console.log(
      `[VideoGenService] Using provider: ${provider.id} for ${nodeType}`
    );

    return await provider.createTask(request, config, abortSignal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return { error: message };
  }
}

/**
 * 获取视频任务状态
 */
export async function getVideoTaskStatus(
  taskId: string,
  nodeType: VideoNodeType = "videoGenerator"
): Promise<VideoTaskResponse> {
  try {
    const config = getProviderConfig(nodeType);
    const provider = videoGenerationRegistry.getByProtocol(config.protocol);

    if (!provider) {
      return { error: `不支持的协议类型: ${config.protocol}` };
    }

    return await provider.getTaskStatus(taskId, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取状态失败";
    return { error: message };
  }
}

/**
 * 获取视频内容并创建 Blob URL（用于预览）
 */
export async function getVideoContentBlobUrl(
  taskId: string,
  nodeType: VideoNodeType = "videoGenerator"
): Promise<{ url?: string; error?: string }> {
  try {
    const config = getProviderConfig(nodeType);
    const provider = videoGenerationRegistry.getByProtocol(config.protocol);

    if (!provider) {
      return { error: `不支持的协议类型: ${config.protocol}` };
    }

    const result = await provider.getVideoContent(taskId, config);

    if (result.error || !result.videoData) {
      return { error: result.error || "获取视频失败" };
    }

    // 将 base64 转换为 Blob URL
    const byteCharacters = atob(result.videoData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    return { url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取视频内容失败";
    return { error: message };
  }
}

/**
 * 下载视频文件
 */
export async function downloadVideo(
  taskId: string,
  filename?: string,
  nodeType: VideoNodeType = "videoGenerator"
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getProviderConfig(nodeType);
    const provider = videoGenerationRegistry.getByProtocol(config.protocol);

    if (!provider) {
      const errorMsg = `不支持的协议类型: ${config.protocol}`;
      toast.error(`下载失败: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const defaultFileName = filename || `video-${Date.now()}.mp4`;

    console.log("[VideoGenService] Downloading video...");
    const result = await provider.getVideoContent(taskId, config);

    if (result.error || !result.videoData) {
      const errorMsg = result.error || "下载视频失败";
      toast.error(`下载失败: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // 将 base64 转换为 Uint8Array
    const byteCharacters = atob(result.videoData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const bytes = new Uint8Array(byteNumbers);

    // 使用 Tauri 保存对话框
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "视频", extensions: ["mp4", "webm", "mov"] }],
    });

    if (filePath) {
      await writeFile(filePath, bytes);
      toast.success(`视频已保存到: ${filePath.split("/").pop()}`);
      return { success: true };
    } else {
      // 用户取消了保存
      return { success: false };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载视频失败";
    toast.error(`下载失败: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * 轮询任务状态直到完成
 */
export async function pollVideoTask(
  taskId: string,
  onProgress?: (info: VideoProgressInfo) => void,
  maxAttempts: number = 120, // 最多轮询 10 分钟（5秒间隔）
  interval: number = 5000,
  signal?: AbortSignal,
  nodeType: VideoNodeType = "videoGenerator"
): Promise<VideoGenerationResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    // 检查是否被取消
    if (signal?.aborted) {
      return { error: "已取消" };
    }

    const statusResult = await getVideoTaskStatus(taskId, nodeType);

    if (statusResult.error) {
      return statusResult;
    }

    const stage = statusResult.status as VideoTaskStage;

    onProgress?.({
      progress: statusResult.progress || 0,
      stage,
      taskId,
    });

    if (stage === "completed") {
      // 任务完成，返回 taskId 供后续获取视频内容
      return {
        taskId,
        status: "completed",
        progress: 100,
      };
    }

    if (stage === "failed") {
      return { error: statusResult.error || "视频生成失败" };
    }

    // 等待后继续轮询（可中断的等待）
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(resolve, interval);
      // 如果有 signal，监听中断事件
      if (signal) {
        const onAbort = () => {
          clearTimeout(timeoutId);
          resolve(); // 直接 resolve，让循环检查 aborted 状态
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
    attempts++;
  }

  return { error: "任务超时，请稍后重试" };
}

/**
 * 完整的视频生成流程
 */
export async function generateVideo(
  request: VideoGenerationRequest,
  onProgress?: (info: VideoProgressInfo) => void,
  nodeType: VideoNodeType = "videoGenerator"
): Promise<VideoGenerationResponse> {
  // 1. 创建任务
  const createResult = await createVideoTask(request, nodeType);

  if (createResult.error || !createResult.taskId) {
    return { error: createResult.error || "创建任务失败" };
  }

  const taskId = createResult.taskId;

  onProgress?.({
    progress: 0,
    stage: "queued",
    taskId,
  });

  // 2. 轮询等待完成
  return await pollVideoTask(taskId, onProgress, 120, 5000, undefined, nodeType);
}

/**
 * 获取提供商支持的能力
 */
export function getVideoProviderCapabilities(nodeType: VideoNodeType) {
  try {
    const config = getProviderConfig(nodeType);
    const provider = videoGenerationRegistry.getByProtocol(config.protocol);
    return provider
      ? {
          capabilities: provider.capabilities,
          supportedSizes: provider.supportedSizes,
          supportedDurations: provider.supportedDurations,
          supportsInputImage: provider.supportsInputImage,
        }
      : null;
  } catch {
    return null;
  }
}

// 重新导出类型
export type {
  VideoGenerationRequest,
  VideoTaskResponse,
  VideoGenerationResponse,
  VideoProviderConfig,
  VideoNodeType,
  VideoProgressInfo,
  VideoTaskStage,
  VideoSizeType,
  VideoDurationType,
} from "./types";
