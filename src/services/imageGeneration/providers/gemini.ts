/**
 * 图片生成框架 - Gemini 提供商实现
 *
 * 支持 NanoBanana Pro (gemini-3-pro-image-preview) 和
 * NanoBanana (gemini-2.5-flash-image) 两种模型
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

// Tauri 后端响应类型
interface TauriGeminiResult {
  success: boolean;
  imageData?: string;
  text?: string;
  error?: string;
}

/**
 * Gemini/Google 图片生成提供商
 */
export class GeminiImageProvider implements ImageGenerationProvider {
  readonly id = "gemini";
  readonly name = "Google Gemini";
  readonly protocol = "google" as const;

  readonly capabilities: ImageGenerationCapability[] = [
    "text-to-image",
    "image-editing",
  ];

  readonly supportedAspectRatios = [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "3:2",
    "2:3",
    "5:4",
    "4:5",
    "21:9",
  ];

  readonly supportedImageSizes = ["1K", "2K", "4K"];

  readonly supportsMultipleInputImages = true;
  readonly maxInputImages = 10;

  /**
   * 检测是否在 Tauri 环境
   */
  private isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

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
      request.aspectRatio &&
      !this.supportedAspectRatios.includes(request.aspectRatio)
    ) {
      return { valid: false, error: `不支持的宽高比: ${request.aspectRatio}` };
    }

    if (
      request.imageSize &&
      !this.supportedImageSizes?.includes(request.imageSize)
    ) {
      return { valid: false, error: `不支持的分辨率: ${request.imageSize}` };
    }

    if (
      request.inputImages &&
      request.inputImages.length > this.maxInputImages
    ) {
      return {
        valid: false,
        error: `输入图片数量超过限制 (最多 ${this.maxInputImages} 张)`,
      };
    }

    return { valid: true };
  }

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(request: ImageGenerationRequest, config: ProviderConfig) {
    const apiBaseUrl = `${config.baseUrl.replace(/\/+$/, "")}/v1beta`;

    return {
      baseUrl: apiBaseUrl,
      apiKey: config.apiKey,
      model: request.model,
      prompt: request.prompt,
      inputImages: request.inputImages,
      aspectRatio: request.aspectRatio || "1:1",
      imageSize: request.imageSize,
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
      if (this.isTauri()) {
        return await this.generateViaTauri(request, config);
      } else {
        return await this.generateViaSDK(request, config, abortSignal);
      }
    } catch (error) {
      // 检查是否是中断错误
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

    console.log("[GeminiProvider] Generating via Tauri backend...");
    console.log("[GeminiProvider] params:", {
      ...params,
      inputImages: params.inputImages?.length || 0,
      apiKey: "***",
    });

    const result = await invoke<TauriGeminiResult>("gemini_generate_content", {
      params,
    });

    if (!result.success) {
      const errorMessage = result.error || "请求失败";
      return {
        error: errorMessage,
        errorDetails: this.buildErrorDetails(
          new Error(errorMessage),
          request,
          config
        ),
      };
    }

    return {
      imageData: result.imageData,
      text: result.text,
      metadata: {
        model: request.model,
      },
    };
  }

  /**
   * 通过 Web SDK 生成（浏览器环境）
   */
  private async generateViaSDK(
    request: ImageGenerationRequest,
    config: ProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<ImageGenerationResponse> {
    const { GoogleGenAI } = await import("@google/genai");

    const apiBaseUrl = `${config.baseUrl.replace(/\/+$/, "")}/v1beta`;
    const client = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: { baseUrl: apiBaseUrl },
    });

    // 构建请求内容
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: request.prompt }];

    // 添加输入图片
    if (request.inputImages?.length) {
      for (const imageData of request.inputImages) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: imageData,
          },
        });
      }
    }

    const response = await client.models.generateContent({
      model: request.model,
      contents: [{ parts }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: request.aspectRatio || "1:1",
          ...(request.imageSize ? { imageSize: request.imageSize } : {}),
        },
        abortSignal,
      },
    });

    // 解析响应
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { error: "无有效响应" };
    }

    let imageData: string | undefined;
    let text: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
      } else if (part.text) {
        text = part.text;
      }
    }

    return {
      imageData,
      text,
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
      requestUrl: `${config.baseUrl}/v1beta/models/${request.model}:generateContent`,
    };
  }
}

// 导出单例
export const geminiImageProvider = new GeminiImageProvider();
