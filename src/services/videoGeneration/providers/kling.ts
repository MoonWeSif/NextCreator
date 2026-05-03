/**
 * 视频生成框架 - Kling 提供商实现
 *
 * 支持 Kling API 格式的视频生成
 * - 文生视频（Text-to-Video）
 * - 图生视频（Image-to-Video）
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoTaskResponse,
  VideoProviderConfig,
  VideoGenerationCapability,
} from "../types";
import type { ErrorDetails } from "@/types";

// Kling 支持的模型
export type KlingModel = "kling-v1" | "kling-v1-5" | string;

// Kling 生成模式
export type KlingMode = "text2video" | "image2video";

// Kling 视频尺寸预设
export interface KlingVideoSize {
  width: number;
  height: number;
  label: string;
}

// Kling 预设尺寸
export const KLING_VIDEO_SIZES: KlingVideoSize[] = [
  { width: 1280, height: 720, label: "720p 横屏" },
  { width: 720, height: 1280, label: "720p 竖屏" },
  { width: 1920, height: 1080, label: "1080p 横屏" },
  { width: 1080, height: 1920, label: "1080p 竖屏" },
  { width: 1024, height: 1024, label: "1024x1024 方形" },
];

// Kling metadata 扩展参数
export interface KlingMetadata {
  negativePrompt?: string;
  style?: string;
  qualityLevel?: string;
}

// Kling 生成请求参数
export interface KlingGenerationRequest {
  prompt: string;
  model: KlingModel;
  mode: KlingMode;
  image?: string;  // base64 编码的图片或 URL（仅图生视频模式）
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  n?: number;
  metadata?: KlingMetadata;
}

// Tauri 后端请求参数
interface TauriKlingCreateParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  mode: string;
  image?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  n?: number;
  metadata?: {
    negative_prompt?: string;
    style?: string;
    quality_level?: string;
  };
}

interface TauriKlingStatusParams {
  baseUrl: string;
  apiKey: string;
  taskId: string;
  mode: string;
}

interface TauriKlingDownloadParams {
  videoUrl: string;
}

// Tauri 后端响应
interface TauriKlingTaskResult {
  success: boolean;
  taskId?: string;
  status?: string;
  progress?: number;
  error?: string;
}

interface TauriKlingContentResult {
  success: boolean;
  videoUrl?: string;
  videoData?: string;  // base64
  error?: string;
}

interface TauriKlingDownloadResult {
  success: boolean;
  videoData?: string;  // base64
  error?: string;
}

/**
 * Kling 视频生成提供商
 */
export class KlingVideoProvider implements VideoGenerationProvider {
  readonly id = "kling";
  readonly name = "Kling";
  readonly protocol = "openai" as const;

  readonly capabilities: VideoGenerationCapability[] = [
    "text-to-video",
    "image-to-video",
  ];

  readonly supportedSizes = KLING_VIDEO_SIZES.map(s => `${s.width}x${s.height}`) as never[];

  readonly supportedDurations = ["5", "10"] as never[];

  readonly supportsInputImage = true;

  /**
   * 验证请求参数
   */
  validateRequest(request: VideoGenerationRequest | KlingGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    const klingRequest = this.toKlingRequest(request);
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    if (!klingRequest.model) {
      return { valid: false, error: "请选择模型" };
    }

    // 图生视频模式需要图片
    if (klingRequest.mode === "image2video" && !klingRequest.image) {
      return { valid: false, error: "图生视频模式需要提供图片" };
    }

    return { valid: true };
  }

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(
    request: VideoGenerationRequest | KlingGenerationRequest,
    config: VideoProviderConfig
  ): TauriKlingCreateParams {
    const klingRequest = this.toKlingRequest(request);
    const params: TauriKlingCreateParams = {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: klingRequest.model,
      prompt: klingRequest.prompt,
      mode: klingRequest.mode,
    };

    // 添加图片（图生视频模式）
    if (klingRequest.image) {
      params.image = klingRequest.image;
    }

    // 添加可选参数
    if (klingRequest.duration !== undefined) {
      params.duration = klingRequest.duration;
    }
    if (klingRequest.width !== undefined) {
      params.width = klingRequest.width;
    }
    if (klingRequest.height !== undefined) {
      params.height = klingRequest.height;
    }
    if (klingRequest.fps !== undefined) {
      params.fps = klingRequest.fps;
    }
    if (klingRequest.seed !== undefined) {
      params.seed = klingRequest.seed;
    }
    if (klingRequest.n !== undefined) {
      params.n = klingRequest.n;
    }

    // 添加 metadata
    if (klingRequest.metadata) {
      params.metadata = {};
      if (klingRequest.metadata.negativePrompt) {
        params.metadata.negative_prompt = klingRequest.metadata.negativePrompt;
      }
      if (klingRequest.metadata.style) {
        params.metadata.style = klingRequest.metadata.style;
      }
      if (klingRequest.metadata.qualityLevel) {
        params.metadata.quality_level = klingRequest.metadata.qualityLevel;
      }
    }

    return params;
  }

  /**
   * 创建视频生成任务
   */
  async createTask(
    request: VideoGenerationRequest | KlingGenerationRequest,
    config: VideoProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<VideoTaskResponse> {
    const klingRequest = this.toKlingRequest(request);
    // 验证请求
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // 检查取消
    if (abortSignal?.aborted) {
      return { error: "已取消" };
    }

    try {
      const params = this.buildTauriParams(request, config);
      const endpoint = klingRequest.mode === "image2video" ? "image2video" : "text2video";
      const fullRequestUrl = `${config.baseUrl}/kling/v1/videos/${endpoint}`;

      console.log("[KlingProvider] Creating video task via Tauri backend...");

      // 再次检查取消状态
      if (abortSignal?.aborted) {
        return { error: "已取消" };
      }

      const result = await invoke<TauriKlingTaskResult>("kling_create_task", {
        params,
      });

      // invoke 完成后再检查一次
      if (abortSignal?.aborted) {
        console.log(
          "[KlingProvider] Task created but cancelled by user, taskId:",
          result.taskId
        );
        return { error: "已取消" };
      }

      if (!result.success) {
        const errorMessage = result.error || "创建任务失败";
        return {
          error: errorMessage,
          errorDetails: this.buildErrorDetails(new Error(errorMessage), {
            model: request.model,
            provider: config.name,
            requestUrl: fullRequestUrl,
            requestBody: {
              model: request.model,
              prompt: request.prompt.slice(0, 500),
              mode: klingRequest.mode,
              hasImage: !!klingRequest.image,
            },
          }),
        };
      }

      return {
        taskId: result.taskId,
        status: result.status as VideoTaskResponse["status"],
        progress: result.progress,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建视频任务失败";
      return {
        error: message,
        errorDetails: this.buildErrorDetails(error, {
          model: request.model,
          provider: config.name,
          requestUrl: `${config.baseUrl}/kling/v1/videos/${klingRequest.mode}`,
          requestBody: {
            model: request.model,
            prompt: request.prompt.slice(0, 500),
            mode: klingRequest.mode,
          },
        }),
      };
    }
  }

  private toKlingRequest(request: VideoGenerationRequest | KlingGenerationRequest): KlingGenerationRequest {
    const maybeKling = request as Partial<KlingGenerationRequest>;
    const maybeGeneric = request as Partial<VideoGenerationRequest>;
    const image = maybeKling.image || maybeGeneric.inputImage;
    return {
      prompt: request.prompt,
      model: request.model,
      mode: maybeKling.mode || (image ? "image2video" : "text2video"),
      image,
      duration: request.duration,
      width: request.width,
      height: request.height,
      fps: request.fps,
      seed: request.seed,
      n: request.n,
      metadata: maybeKling.metadata as KlingMetadata | undefined,
    };
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(
    taskId: string,
    config: VideoProviderConfig,
    mode: KlingMode = "text2video"
  ): Promise<VideoTaskResponse> {
    try {
      const tauriParams: TauriKlingStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
        mode,
      };

      const result = await invoke<TauriKlingTaskResult>("kling_get_status", {
        params: tauriParams,
      });

      if (!result.success) {
        return { error: result.error || "获取状态失败" };
      }

      return {
        taskId: result.taskId,
        status: result.status as VideoTaskResponse["status"],
        progress: result.progress,
        error: result.error,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "获取任务状态失败";
      return { error: message };
    }
  }

  /**
   * 获取视频内容（返回视频 URL）
   */
  async getVideoContent(
    taskId: string,
    config: VideoProviderConfig,
    mode: KlingMode = "text2video"
  ): Promise<{ videoUrl?: string; videoData?: string; error?: string }> {
    try {
      const tauriParams: TauriKlingStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
        mode,
      };

      console.log("[KlingProvider] Fetching video content via Tauri backend...");
      const result = await invoke<TauriKlingContentResult>("kling_get_content", {
        params: tauriParams,
      });

      if (!result.success) {
        return { error: result.error || "获取视频失败" };
      }

      return {
        videoUrl: result.videoUrl,
        videoData: result.videoData,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "获取视频内容失败";
      return { error: message };
    }
  }

  /**
   * 下载视频（从 URL 下载并转换为 base64）
   */
  async downloadVideo(
    videoUrl: string
  ): Promise<{ videoData?: string; error?: string }> {
    try {
      const tauriParams: TauriKlingDownloadParams = {
        videoUrl,
      };

      console.log("[KlingProvider] Downloading video via Tauri backend...");
      const result = await invoke<TauriKlingDownloadResult>("kling_download_video", {
        params: tauriParams,
      });

      if (!result.success || !result.videoData) {
        return { error: result.error || "下载视频失败" };
      }

      return { videoData: result.videoData };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "下载视频失败";
      return { error: message };
    }
  }

  /**
   * 构建错误详情
   */
  private buildErrorDetails(
    error: unknown,
    params: {
      model?: string;
      provider?: string;
      requestUrl?: string;
      requestBody?: unknown;
    }
  ): ErrorDetails {
    const now = new Date().toISOString();
    const isError = error instanceof Error;

    // 解析错误消息，尝试提取状态码
    const message = isError ? error.message : String(error);
    const statusCodeMatch = message.match(/\((\d{3})\)/);
    const statusCode = statusCodeMatch
      ? parseInt(statusCodeMatch[1], 10)
      : undefined;

    const details: ErrorDetails = {
      name: isError ? error.name : "Error",
      message,
      stack: isError ? error.stack : undefined,
      cause: isError && "cause" in error ? error.cause : undefined,
      statusCode,
      timestamp: now,
      model: params.model || "未知",
      provider: params.provider || "未知",
      requestUrl: params.requestUrl || "未知",
      requestBody: params.requestBody,
    };

    // 尝试提取响应内容
    const responseMatch = message.match(
      /API 返回错误\s*\(\d{3}\)[：:]\s*([\s\S]*)/
    );
    if (responseMatch) {
      const responseContent = responseMatch[1].trim();
      try {
        details.responseBody = JSON.parse(responseContent);
      } catch {
        if (responseContent) {
          details.responseBody = responseContent;
        }
      }
    }

    return details;
  }
}

// 导出单例
export const klingVideoProvider = new KlingVideoProvider();
