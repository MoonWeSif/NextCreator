import type { VideoGenerationParams, VideoTaskResponse, VideoGenerationResponse } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";
import { isTauriEnvironment } from "@/services/fileStorageService";
import { toast } from "@/stores/toastStore";

// 任务阶段类型
export type VideoTaskStage = "queued" | "in_progress" | "completed" | "failed";

// 进度回调参数
export interface VideoProgressInfo {
  progress: number;
  stage: VideoTaskStage;
  taskId: string;
}

// 获取 API 配置
function getApiConfig() {
  const { settings } = useSettingsStore.getState();
  const providerId = settings.nodeProviders.videoGenerator;

  if (!providerId) {
    throw new Error("请先在供应商管理中配置视频节点的供应商");
  }

  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error("供应商不存在，请重新配置");
  }

  if (!provider.apiKey) {
    throw new Error("供应商 API Key 未配置");
  }

  // 视频服务直接使用 baseUrl，移除末尾斜杠即可
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");

  return {
    apiKey: provider.apiKey,
    baseUrl,
  };
}

// 创建视频生成任务
export async function createVideoTask(params: VideoGenerationParams): Promise<VideoGenerationResponse> {
  try {
    const { apiKey, baseUrl } = getApiConfig();

    const formData = new FormData();
    formData.append("model", params.model);
    formData.append("prompt", params.prompt);

    if (params.seconds) {
      formData.append("seconds", params.seconds);
    }

    if (params.size) {
      formData.append("size", params.size);
    }

    // 如果有参考图片，添加到请求中
    if (params.inputImage) {
      // 将 base64 转换为 Blob
      const byteCharacters = atob(params.inputImage);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      formData.append("input_reference", blob, "reference.png");
    }

    const response = await fetch(`${baseUrl}/v1/videos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `创建任务失败: ${response.status}`);
    }

    const data: VideoTaskResponse = await response.json();

    return {
      taskId: data.id,
      status: data.status,
      progress: data.progress,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建视频任务失败";
    return { error: message };
  }
}

// 获取视频任务状态
export async function getVideoTaskStatus(taskId: string): Promise<VideoGenerationResponse> {
  try {
    const { apiKey, baseUrl } = getApiConfig();

    const response = await fetch(`${baseUrl}/v1/videos/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `获取状态失败: ${response.status}`);
    }

    const data: VideoTaskResponse = await response.json();

    return {
      taskId: data.id,
      status: data.status,
      progress: data.progress,
      error: data.error?.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取任务状态失败";
    return { error: message };
  }
}

// 获取视频内容 URL（不下载完整内容，返回可播放的 URL）
export function getVideoContentUrl(taskId: string): string {
  const { apiKey, baseUrl } = getApiConfig();
  // 返回带认证的视频 URL，用于直接播放
  // 注意：这需要后端支持 URL 方式访问，或者我们需要创建 blob URL
  return `${baseUrl}/v1/videos/${taskId}/content?authorization=${encodeURIComponent(apiKey)}`;
}

// 获取视频内容并创建 Blob URL（用于预览）
export async function getVideoContentBlobUrl(taskId: string): Promise<{ url?: string; error?: string }> {
  try {
    const { apiKey, baseUrl } = getApiConfig();

    const response = await fetch(`${baseUrl}/v1/videos/${taskId}/content`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `获取视频失败: ${response.status}`);
    }

    // 视频内容作为 blob 返回
    const blob = await response.blob();

    // 创建 Blob URL（比 base64 更高效）
    const url = URL.createObjectURL(blob);

    return { url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取视频内容失败";
    return { error: message };
  }
}

// 下载视频文件
export async function downloadVideo(taskId: string, filename?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { apiKey, baseUrl } = getApiConfig();
    const defaultFileName = filename || `sora-video-${Date.now()}.mp4`;

    const response = await fetch(`${baseUrl}/v1/videos/${taskId}/content`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `下载视频失败: ${response.status}`);
    }

    const blob = await response.blob();

    if (isTauriEnvironment()) {
      // Tauri 环境：使用保存对话框
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: "视频", extensions: ["mp4", "webm", "mov"] }],
      });

      if (filePath) {
        // 将 blob 转换为 Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        await writeFile(filePath, bytes);
        toast.success(`视频已保存到: ${filePath.split("/").pop()}`);
        return { success: true };
      } else {
        // 用户取消了保存
        return { success: false };
      }
    } else {
      // 浏览器环境：使用传统下载
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理 Blob URL
      URL.revokeObjectURL(url);
      toast.success("视频下载已开始");
      return { success: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载视频失败";
    toast.error(`下载失败: ${message}`);
    return { success: false, error: message };
  }
}

// 轮询任务状态直到完成
export async function pollVideoTask(
  taskId: string,
  onProgress?: (info: VideoProgressInfo) => void,
  maxAttempts: number = 120, // 最多轮询 10 分钟（5秒间隔）
  interval: number = 5000
): Promise<VideoGenerationResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResult = await getVideoTaskStatus(taskId);

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

    // 等待后继续轮询
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }

  return { error: "任务超时，请稍后重试" };
}

// 完整的视频生成流程
export async function generateVideo(
  params: VideoGenerationParams,
  onProgress?: (info: VideoProgressInfo) => void
): Promise<VideoGenerationResponse> {
  // 1. 创建任务
  const createResult = await createVideoTask(params);

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
  return await pollVideoTask(taskId, onProgress);
}
