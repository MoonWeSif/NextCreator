/**
 * 视频生成框架 - Sora 提供商实现
 *
 * 支持 OpenAI Sora API 格式的视频生成
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoTaskResponse,
  VideoProviderConfig,
  VideoGenerationCapability,
  VideoSizeType,
  VideoDurationType,
} from "../types";
import type { ErrorDetails } from "@/types";

// Tauri 后端请求参数
interface TauriVideoCreateParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  seconds?: string;
  size?: string;
  inputImage?: string; // base64
}

interface TauriVideoStatusParams {
  baseUrl: string;
  apiKey: string;
  taskId: string;
}

// Tauri 后端响应
interface TauriVideoTaskResult {
  success: boolean;
  taskId?: string;
  status?: string;
  progress?: number;
  error?: string;
}

interface TauriVideoContentResult {
  success: boolean;
  videoData?: string; // base64
  error?: string;
}

/**
 * Sora 视频生成提供商
 */
export class SoraVideoProvider implements VideoGenerationProvider {
  readonly id = "sora";
  readonly name = "OpenAI Sora";
  readonly protocol = "openai" as const;

  readonly capabilities: VideoGenerationCapability[] = [
    "text-to-video",
    "image-to-video",
  ];

  readonly supportedSizes: VideoSizeType[] = [
    "1280x720",
    "720x1280",
    "1792x1024",
    "1024x1792",
  ];

  readonly supportedDurations: VideoDurationType[] = ["10", "15", "25"];

  readonly supportsInputImage = true;

  /**
   * 验证请求参数
   */
  validateRequest(request: VideoGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    if (request.size && !this.supportedSizes.includes(request.size)) {
      return { valid: false, error: `不支持的视频尺寸: ${request.size}` };
    }

    if (request.seconds && !this.supportedDurations.includes(request.seconds)) {
      return { valid: false, error: `不支持的视频时长: ${request.seconds}` };
    }

    return { valid: true };
  }

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(
    request: VideoGenerationRequest,
    config: VideoProviderConfig
  ): TauriVideoCreateParams {
    return {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
      seconds: request.seconds,
      size: request.size,
      inputImage: request.inputImage,
    };
  }

  /**
   * 创建视频生成任务
   */
  async createTask(
    request: VideoGenerationRequest,
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
      const fullRequestUrl = `${config.baseUrl}/v1/video/generations`;

      console.log("[SoraProvider] Creating video task via Tauri backend...");

      // 再次检查取消状态
      if (abortSignal?.aborted) {
        return { error: "已取消" };
      }

      const result = await invoke<TauriVideoTaskResult>("video_create_task", {
        params,
      });

      // invoke 完成后再检查一次
      if (abortSignal?.aborted) {
        console.log(
          "[SoraProvider] Task created but cancelled by user, taskId:",
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
              seconds: request.seconds,
              size: request.size,
              hasInputImage: !!request.inputImage,
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
          requestUrl: `${config.baseUrl}/v1/video/generations`,
          requestBody: {
            model: request.model,
            prompt: request.prompt.slice(0, 500),
            seconds: request.seconds,
            size: request.size,
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
      const tauriParams: TauriVideoStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
      };

      const result = await invoke<TauriVideoTaskResult>("video_get_status", {
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
      const tauriParams: TauriVideoStatusParams = {
        baseUrl: config.baseUrl.replace(/\/+$/, ""),
        apiKey: config.apiKey,
        taskId,
      };

      console.log("[SoraProvider] Fetching video content via Tauri backend...");
      const result = await invoke<TauriVideoContentResult>("video_get_content", {
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
export const soraVideoProvider = new SoraVideoProvider();
