/**
 * new-api 通用视频任务协议
 *
 * - 创建任务: POST /v1/video/generations
 * - 查询状态: GET /v1/video/generations/{task_id}
 * - 完成结果: 状态响应中的 url 字段
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  VideoGenerationCapability,
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoProviderConfig,
  VideoTaskResponse,
  VideoTaskStage,
} from "../types";
import type { ErrorDetails } from "@/types";

interface TauriNewApiVideoCreateParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  image?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  n?: number;
  responseFormat?: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

interface TauriNewApiVideoStatusParams {
  baseUrl: string;
  apiKey: string;
  taskId: string;
}

interface TauriNewApiVideoTaskResult {
  success: boolean;
  taskId?: string;
  status?: string;
  progress?: number;
  videoUrl?: string;
  format?: string;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  error?: string;
}

function extractVideoData(raw?: Record<string, unknown>): string | undefined {
  if (!raw) return undefined;

  const direct =
    raw.b64_json ||
    raw.video_data ||
    raw.videoData ||
    raw.data;

  if (typeof direct === "string") return direct;

  if (Array.isArray(raw.data)) {
    const firstVideo = raw.data.find((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return typeof record.b64_json === "string" ||
        typeof record.video_data === "string" ||
        typeof record.videoData === "string";
    }) as Record<string, unknown> | undefined;

    const nested =
      firstVideo?.b64_json ||
      firstVideo?.video_data ||
      firstVideo?.videoData;
    if (typeof nested === "string") return nested;
  }

  return undefined;
}

export class NewApiVideoProvider implements VideoGenerationProvider {
  readonly id = "newApiVideo";
  readonly name = "new-api Video";
  readonly protocol = "openai" as const;

  readonly capabilities: VideoGenerationCapability[] = [
    "text-to-video",
    "image-to-video",
  ];

  readonly supportedSizes = ["1280x720", "720x1280", "1920x1080", "1080x1920"];
  readonly supportedDurations = ["5", "8", "10", "15"];
  readonly supportsInputImage = true;

  validateRequest(request: VideoGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    if (request.width != null && request.width <= 0) {
      return { valid: false, error: "视频宽度必须大于 0" };
    }

    if (request.height != null && request.height <= 0) {
      return { valid: false, error: "视频高度必须大于 0" };
    }

    if (request.duration != null && request.duration <= 0) {
      return { valid: false, error: "视频时长必须大于 0" };
    }

    if (request.fps != null && request.fps <= 0) {
      return { valid: false, error: "帧率必须大于 0" };
    }

    if (request.n != null && request.n <= 0) {
      return { valid: false, error: "生成数量必须大于 0" };
    }

    return { valid: true };
  }

  buildTauriParams(
    request: VideoGenerationRequest,
    config: VideoProviderConfig
  ): TauriNewApiVideoCreateParams {
    return {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
      image: request.inputImage,
      duration: request.duration,
      width: request.width,
      height: request.height,
      fps: request.fps,
      seed: request.seed,
      n: request.n,
      responseFormat: request.responseFormat,
      user: request.user,
      metadata: request.metadata,
    };
  }

  async createTask(
    request: VideoGenerationRequest,
    config: VideoProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<VideoTaskResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) return { error: validation.error };

    if (abortSignal?.aborted) return { error: "已取消" };

    try {
      const params = this.buildTauriParams(request, config);
      const result = await invoke<TauriNewApiVideoTaskResult>("newapi_video_create_task", {
        params,
      });

      if (abortSignal?.aborted) return { error: "已取消" };

      if (!result.success) {
        const errorMessage = result.error || "创建任务失败";
        return {
          error: errorMessage,
          errorDetails: this.buildErrorDetails(new Error(errorMessage), request, config, "create"),
        };
      }

      return {
        taskId: result.taskId,
        status: this.normalizeStatus(result.status),
        progress: result.progress,
        videoUrl: result.videoUrl,
        videoData: extractVideoData(result.raw),
        format: result.format,
        metadata: result.metadata,
        raw: result.raw,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建视频任务失败";
      return {
        error: message,
        errorDetails: this.buildErrorDetails(error, request, config, "create"),
      };
    }
  }

  async getTaskStatus(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<VideoTaskResponse> {
    try {
      const params: TauriNewApiVideoStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
      };
      const result = await invoke<TauriNewApiVideoTaskResult>("newapi_video_get_status", {
        params,
      });

      if (!result.success) {
        return { error: result.error || "获取状态失败" };
      }

      return {
        taskId: result.taskId || taskId,
        status: this.normalizeStatus(result.status),
        progress: result.progress,
        videoUrl: result.videoUrl,
        videoData: extractVideoData(result.raw),
        format: result.format,
        metadata: result.metadata,
        raw: result.raw,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取任务状态失败";
      return { error: message };
    }
  }

  async getVideoContent(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<{ videoData?: string; videoUrl?: string; error?: string }> {
    const status = await this.getTaskStatus(taskId, config);
    if (status.error) return { error: status.error };
    if (status.videoData) return { videoData: status.videoData };
    if (!status.videoUrl) return { error: "任务响应中没有视频 URL" };
    return { videoUrl: status.videoUrl };
  }

  private buildErrorDetails(
    error: unknown,
    request: VideoGenerationRequest,
    config: VideoProviderConfig,
    phase: "create" | "status"
  ): ErrorDetails {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return {
      name: isError ? error.name : "Error",
      message,
      stack: isError ? error.stack : undefined,
      cause: isError && "cause" in error ? error.cause : undefined,
      timestamp: new Date().toISOString(),
      model: request.model,
      provider: config.name,
      requestUrl: `${config.baseUrl}/v1/video/generations${phase === "status" ? "/{task_id}" : ""}`,
      requestBody: {
        model: request.model,
        prompt: request.prompt.slice(0, 500),
        hasImage: Boolean(request.inputImage),
        duration: request.duration,
        width: request.width,
        height: request.height,
        fps: request.fps,
        seed: request.seed,
        n: request.n,
        responseFormat: request.responseFormat,
        metadata: request.metadata,
      },
    };
  }

  private normalizeStatus(status?: string): VideoTaskStage | undefined {
    if (status === "completed" || status === "succeeded" || status === "success") return "completed";
    if (status === "failed" || status === "failure" || status === "cancelled" || status === "expired") return "failed";
    if (status === "in_progress" || status === "processing" || status === "running") return "in_progress";
    if (status === "queued" || status === "pending") return "queued";
    return status as VideoTaskStage | undefined;
  }
}

export const newApiVideoProvider = new NewApiVideoProvider();
