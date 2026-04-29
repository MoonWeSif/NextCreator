/**
 * 图片生成框架 - OpenAI GPT Image 提供商实现
 *
 * GPT Image 使用 OpenAI Images API：
 * - 无输入图：/v1/images/generations
 * - 有输入图或蒙版：/v1/images/edits
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

interface TauriOpenAIImageResult {
  success: boolean;
  imageData?: string;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

const GPT_IMAGE_2 = "gpt-image-2";

const GPT_IMAGE_2_ALLOWED_BACKGROUNDS = new Set(["auto", "opaque"]);

function hasInputImages(request: ImageGenerationRequest): boolean {
  return !!request.inputImages?.some((image) => image.trim().length > 0);
}

function validateGptImage2Size(size?: string): string | undefined {
  if (!size || size === "auto") return undefined;

  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return "尺寸格式无效";

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width <= 0 || height <= 0) return "宽高必须大于 0";
  if (width % 16 !== 0 || height % 16 !== 0) return "宽高必须是 16 的倍数";
  if (Math.max(width, height) > 3840) return "最长边不能超过 3840";
  if (Math.max(width, height) / Math.min(width, height) > 3) {
    return "宽高比不能超过 3:1";
  }

  const pixels = width * height;
  if (pixels < 655360) return "总像素不能低于 655,360";
  if (pixels > 8294400) return "总像素不能超过 8,294,400";

  return undefined;
}

/**
 * OpenAI GPT Image 图片生成提供商
 */
export class GptImageProvider implements ImageGenerationProvider {
  readonly id = "gptImage";
  readonly name = "OpenAI GPT Image";
  readonly protocol = "openai" as const;

  readonly capabilities: ImageGenerationCapability[] = [
    "text-to-image",
    "image-editing",
    "inpainting",
    "outpainting",
  ];

  readonly supportedAspectRatios = ["1:1", "16:9", "9:16"];

  readonly supportedImageSizes = [
    "auto",
    "1024x1024",
    "2048x2048",
    "2880x2880",
    "1536x864",
    "2048x1152",
    "3840x2160",
    "864x1536",
    "1152x2048",
    "2160x3840",
    "1536x1152",
    "1152x1536",
    "1536x1024",
    "1024x1536",
    "1600x1280",
    "1280x1600",
    "1792x768",
    "2304x768",
    "custom",
  ];

  readonly supportsMultipleInputImages = true;
  readonly maxInputImages = 1500;

  validateRequest(request: ImageGenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt?.trim()) {
      return { valid: false, error: "提示词不能为空" };
    }

    const inputCount = request.inputImages?.filter((image) => image.trim()).length ?? 0;
    if (inputCount > this.maxInputImages) {
      return {
        valid: false,
        error: `GPT Image 最多支持 ${this.maxInputImages} 张参考图`,
      };
    }

    if (request.maskImage && inputCount === 0) {
      return { valid: false, error: "使用蒙版编辑时必须连接至少一张原图" };
    }

    if (
      request.model === GPT_IMAGE_2 &&
      request.background &&
      !GPT_IMAGE_2_ALLOWED_BACKGROUNDS.has(request.background)
    ) {
      return {
        valid: false,
        error: "GPT Image 2 暂不支持透明背景，请选择自动或不透明",
      };
    }

    if (request.model === GPT_IMAGE_2) {
      const sizeError = validateGptImage2Size(request.size);
      if (sizeError) {
        return { valid: false, error: sizeError };
      }
    }

    return { valid: true };
  }

  buildTauriParams(request: ImageGenerationRequest, config: ProviderConfig) {
    const isEdit = hasInputImages(request) || !!request.maskImage;
    const isGptImage2 = request.model === GPT_IMAGE_2;

    return {
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
      operation: isEdit ? "edit" : "generation",
      inputImages: request.inputImages?.filter((image) => image.trim()),
      maskImage: request.maskImage,
      size: request.size || "auto",
      quality: request.quality || "auto",
      background: request.background || "auto",
      outputFormat: request.outputFormat || "png",
      outputCompression: request.outputCompression,
      moderation: request.moderation || "auto",
      inputFidelity: isGptImage2 ? undefined : request.inputFidelity,
    };
  }

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

  private async generateViaTauri(
    request: ImageGenerationRequest,
    config: ProviderConfig
  ): Promise<ImageGenerationResponse> {
    const params = this.buildTauriParams(request, config);
    const result = await invoke<TauriOpenAIImageResult>("dalle_generate_image", {
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

    if (!result.imageData) {
      return {
        error: "API 返回成功但未包含图片数据",
        errorDetails: {
          name: "EmptyImageData",
          message: "API 返回成功但未包含图片数据",
          timestamp: new Date().toISOString(),
          model: request.model,
          provider: config.name,
          requestUrl: `${config.baseUrl}/v1/images/${hasInputImages(request) || request.maskImage ? "edits" : "generations"}`,
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
      metadata: {
        model: request.model,
        revisedPrompt: result.revisedPrompt,
      },
    };
  }

  private buildErrorDetails(
    error: unknown,
    request: ImageGenerationRequest,
    config: ProviderConfig
  ): ErrorDetails {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const endpoint = hasInputImages(request) || request.maskImage ? "edits" : "generations";

    return {
      name: isError ? error.name : "Error",
      message,
      stack: isError ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      model: request.model,
      provider: config.name,
      requestUrl: `${config.baseUrl}/v1/images/${endpoint}`,
    };
  }
}

export const gptImageProvider = new GptImageProvider();
