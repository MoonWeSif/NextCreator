/**
 * 图片生成框架 - Flux 提供商实现
 *
 * Flux 使用 OpenAI Images API 格式，支持宽高比参数
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderConfig,
  ImageGenerationCapability,
} from "../types";
import type { ErrorDetails } from "@/types";

// Tauri 后端响应类型（复用 DALL-E 的响应格式）
interface TauriDalleResult {
  success: boolean;
  imageData?: string;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

/**
 * Flux 图片生成提供商
 */
export class FluxImageProvider implements ImageGenerationProvider {
  readonly id = "flux";
  readonly name = "Flux";
  readonly protocol = "openai" as const;

  readonly capabilities: ImageGenerationCapability[] = [
    "text-to-image",
    "image-editing",
  ];

  // Flux 支持的宽高比
  readonly supportedAspectRatios = [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "3:2",
    "2:3",
  ];

  readonly supportedImageSizes: string[] = [];
  readonly supportsMultipleInputImages = false;
  readonly maxInputImages = 1;

  /**
   * 验证请求参数
   */
  validateRequest(request: ImageGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    if (
      request.inputImages &&
      request.inputImages.length > this.maxInputImages
    ) {
      return {
        valid: false,
        error: `Flux 最多支持 ${this.maxInputImages} 张参考图`,
      };
    }

    return { valid: true };
  }

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(request: ImageGenerationRequest, config: ProviderConfig) {
    return {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
      inputImages: request.inputImages,
      // Flux 使用 aspect_ratio 而不是 size
      aspectRatio: request.aspectRatio || "1:1",
      negativePrompt: request.negativePrompt,
    };
  }

  /**
   * 生成图片
   */
  async generate(
    request: ImageGenerationRequest,
    config: ProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<ImageGenerationResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return { error: validation.error };
    }

    if (abortSignal?.aborted) {
      return { error: "已取消" };
    }

    try {
      return await this.generateViaTauri(request, config);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { error: "已取消" };
      }
      const message = error instanceof Error ? error.message : "生成失败";
      return {
        error: message,
        errorDetails: this.buildErrorDetails(error, request, config),
      };
    }
  }

  /**
   * 通过 Tauri 后端生成
   */
  private async generateViaTauri(
    request: ImageGenerationRequest,
    config: ProviderConfig
  ): Promise<ImageGenerationResponse> {
    const params = this.buildTauriParams(request, config);

    console.log("[FluxProvider] Generating via Tauri backend...");

    const result = await invoke<TauriDalleResult>("dalle_generate_image", {
      params,
    });

    if (!result.success) {
      return {
        error: result.error || "请求失败",
        errorDetails: this.buildErrorDetails(
          new Error(result.error || "请求失败"),
          request,
          config
        ),
      };
    }

    // 检查是否有图片数据
    if (!result.imageData) {
      return {
        error: "API 返回成功但未包含图片数据",
        errorDetails: {
          name: "EmptyImageData",
          message: "API 返回成功但未包含图片数据",
          timestamp: new Date().toISOString(),
          model: request.model,
          provider: config.name,
          requestUrl: `${config.baseUrl}/v1/images/generations`,
          responseBody: {
            success: result.success,
            imageUrl: result.imageUrl,
            revisedPrompt: result.revisedPrompt,
            hasImageData: !!result.imageData,
          },
        },
      };
    }

    return {
      imageData: result.imageData,
      metadata: { model: request.model },
    };
  }

  /**
   * 构建错误详情
   */
  private buildErrorDetails(
    error: unknown,
    request: ImageGenerationRequest,
    config: ProviderConfig
  ): ErrorDetails {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return {
      name: isError ? error.name : "Error",
      message,
      stack: isError ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      model: request.model,
      provider: config.name,
      requestUrl: `${config.baseUrl}/v1/images/generations`,
    };
  }
}

// 导出单例
export const fluxImageProvider = new FluxImageProvider();