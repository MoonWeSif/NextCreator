/**
 * 视频生成框架 - Veo 提供商实现
 *
 * 支持 Gemini Veo API 格式的视频生成
 * - 文生视频（Text-to-Video）
 * - 图生视频（Image-to-Video，单图作为首帧）
 * - 帧插值（Frame Interpolation，双图首尾帧）
 * - 参考图片（Reference Images，仅标准版支持）
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  VideoGenerationProvider,
  VideoTaskResponse,
  VideoProviderConfig,
  VideoGenerationCapability,
} from "../types";
import type { ErrorDetails } from "@/types";

// Veo 特有的视频尺寸类型（宽高比格式）
export type VeoAspectRatio = "16:9" | "9:16";

// Veo 特有的视频时长类型
export type VeoDurationType = "4" | "6" | "8";

// Veo 人物生成策略
export type VeoPersonGeneration = "allow_adult";

// Veo 参考图片
export interface VeoReferenceImage {
  image: {
    bytesBase64Encoded: string;  // base64 或 URL
    mimeType?: string;
  };
  referenceType: "asset";
}

// Veo 生成请求参数
export interface VeoGenerationRequest {
  prompt: string;
  model: string;
  images?: string[];  // base64 编码的图片数组（1张=图生视频，2张=帧插值）
  metadata?: {
    aspectRatio?: VeoAspectRatio;
    durationSeconds?: number;
    negativePrompt?: string;
    personGeneration?: VeoPersonGeneration;
    referenceImages?: VeoReferenceImage[];
  };
}

// Tauri 后端请求参数
interface TauriVeoCreateParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  images?: string[];  // base64 数组
  metadata?: {
    aspectRatio?: string;
    durationSeconds?: number;
    negativePrompt?: string;
    personGeneration?: string;
    referenceImages?: VeoReferenceImage[];
  };
}

interface TauriVeoStatusParams {
  baseUrl: string;
  apiKey: string;
  taskId: string;
}

// Tauri 后端响应
interface TauriVeoTaskResult {
  success: boolean;
  taskId?: string;
  status?: string;
  progress?: number;
  error?: string;
}

interface TauriVeoContentResult {
  success: boolean;
  videoData?: string; // base64
  error?: string;
}

/**
 * Veo 视频生成提供商
 */
export class VeoVideoProvider implements VideoGenerationProvider {
  readonly id = "veo";
  readonly name = "Gemini Veo";
  readonly protocol = "openai" as const;  // 使用 OpenAI 兼容协议

  readonly capabilities: VideoGenerationCapability[] = [
    "text-to-video",
    "image-to-video",
  ];

  // Veo 不使用传统的像素尺寸，而是宽高比
  readonly supportedSizes = [] as never[];

  // Veo 支持的时长
  readonly supportedDurations = ["4", "6", "8"] as never[];

  readonly supportsInputImage = true;

  // Veo 支持的宽高比
  readonly supportedAspectRatios: VeoAspectRatio[] = ["16:9", "9:16"];

  /**
   * 验证请求参数
   */
  validateRequest(request: VeoGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    const images = request.images || [];
    const metadata = request.metadata;
    const hasReferenceImages = metadata?.referenceImages && metadata.referenceImages.length > 0;

    // 帧插值模式：2张图片，时长必须为8
    if (images.length === 2) {
      if (metadata?.durationSeconds && metadata.durationSeconds !== 8) {
        return { valid: false, error: "帧插值模式时长必须为 8 秒" };
      }
      if (hasReferenceImages) {
        return { valid: false, error: "帧插值模式不能同时使用参考图片" };
      }
    }

    // 参考图片模式
    if (hasReferenceImages) {
      if (images.length > 0) {
        return { valid: false, error: "参考图片不能与 images 同时使用" };
      }
      if (metadata?.durationSeconds && metadata.durationSeconds !== 8) {
        return { valid: false, error: "使用参考图片时时长必须为 8 秒" };
      }
      if (metadata!.referenceImages!.length > 3) {
        return { valid: false, error: "参考图片最多 3 张" };
      }
      // 检查模型是否支持参考图片（仅标准版支持）
      if (request.model.includes("fast")) {
        return { valid: false, error: "快速版模型不支持参考图片功能" };
      }
    }

    return { valid: true };
  }

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(
    request: VeoGenerationRequest,
    config: VideoProviderConfig
  ): TauriVeoCreateParams {
    const params: TauriVeoCreateParams = {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
    };

    // 添加图片（图生视频或帧插值）
    if (request.images && request.images.length > 0) {
      params.images = request.images;
    }

    // 添加 metadata
    if (request.metadata) {
      params.metadata = {};

      if (request.metadata.aspectRatio) {
        params.metadata.aspectRatio = request.metadata.aspectRatio;
      }
      if (request.metadata.durationSeconds) {
        params.metadata.durationSeconds = request.metadata.durationSeconds;
      }
      if (request.metadata.negativePrompt) {
        params.metadata.negativePrompt = request.metadata.negativePrompt;
      }
      if (request.metadata.personGeneration) {
        params.metadata.personGeneration = request.metadata.personGeneration;
      }
      if (request.metadata.referenceImages && request.metadata.referenceImages.length > 0) {
        params.metadata.referenceImages = request.metadata.referenceImages;
      }
    }

    return params;
  }

  /**
   * 创建视频生成任务
   */
  async createTask(
    request: VeoGenerationRequest,
    config: VideoProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<VideoTaskResponse> {
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
      const fullRequestUrl = `${config.baseUrl}/v1/videos`;

      console.log("[VeoProvider] Creating video task via Tauri backend...");

      // 再次检查取消状态
      if (abortSignal?.aborted) {
        return { error: "已取消" };
      }

      const result = await invoke<TauriVeoTaskResult>("veo_create_task", {
        params,
      });

      // invoke 完成后再检查一次
      if (abortSignal?.aborted) {
        console.log(
          "[VeoProvider] Task created but cancelled by user, taskId:",
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
              imagesCount: request.images?.length || 0,
              metadata: request.metadata,
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
          requestUrl: `${config.baseUrl}/v1/videos`,
          requestBody: {
            model: request.model,
            prompt: request.prompt.slice(0, 500),
            imagesCount: request.images?.length || 0,
          },
        }),
      };
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<VideoTaskResponse> {
    try {
      const tauriParams: TauriVeoStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
      };

      const result = await invoke<TauriVeoTaskResult>("veo_get_status", {
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
   * 获取视频内容
   */
  async getVideoContent(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<{ videoData?: string; error?: string }> {
    try {
      const tauriParams: TauriVeoStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
      };

      console.log("[VeoProvider] Fetching video content via Tauri backend...");
      const result = await invoke<TauriVeoContentResult>("veo_get_content", {
        params: tauriParams,
      });

      if (!result.success || !result.videoData) {
        return { error: result.error || "获取视频失败" };
      }

      return { videoData: result.videoData };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "获取视频内容失败";
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
export const veoVideoProvider = new VeoVideoProvider();
