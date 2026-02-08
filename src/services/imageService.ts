import { invoke } from "@tauri-apps/api/core";
import type { ImageGenerationParams, ImageEditParams, GenerationResponse, ErrorDetails } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

// 图片节点类型
type ImageNodeType = "imageGeneratorPro" | "imageGeneratorFast";

// 获取供应商配置
function getProviderConfig(nodeType: ImageNodeType) {
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

  return provider;
}

// Tauri 后端代理请求参数
interface TauriGeminiParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  inputImages?: string[];
  aspectRatio?: string;
  imageSize?: string;
}

// Tauri 后端代理响应
interface TauriGeminiResult {
  success: boolean;
  imageData?: string;
  text?: string;
  error?: string;
}

// 通过 Tauri 后端代理发送请求
async function invokeGemini(params: TauriGeminiParams, provider?: { name: string; protocol: string }): Promise<GenerationResponse> {
  console.log("[imageService] invokeGemini called, sending to Tauri backend...");
  console.log("[imageService] params:", { ...params, inputImages: params.inputImages?.length || 0, apiKey: "***" });

  // 构建完整请求 URL
  const protocol = provider?.protocol || "google";
  let fullRequestUrl = params.baseUrl;
  if (protocol === "google") {
    fullRequestUrl = `${params.baseUrl}/models/${params.model}:generateContent`;
  }

  // 构建请求体信息
  const requestBody = {
    model: params.model,
    prompt: params.prompt.slice(0, 500),
    aspectRatio: params.aspectRatio,
    imageSize: params.imageSize,
    hasInputImages: !!(params.inputImages && params.inputImages.length > 0),
    inputImagesCount: params.inputImages?.length || 0,
  };

  try {
    const startTime = Date.now();
    const result = await invoke<TauriGeminiResult>("gemini_generate_content", { params });
    const elapsed = Date.now() - startTime;

    console.log("[imageService] Tauri backend response received in", elapsed, "ms");
    console.log("[imageService] result:", { success: result.success, hasImage: !!result.imageData, error: result.error });

    if (!result.success) {
      const errorMessage = result.error || "请求失败";

      // 构建详细错误信息
      const errorDetails: ErrorDetails = {
        name: "API_Error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        model: params.model,
        provider: provider?.name || "未知",
        requestUrl: fullRequestUrl,
        requestBody,
      };

      // 尝试提取状态码
      const statusCodeMatch = errorMessage.match(/\((\d{3})\)/);
      if (statusCodeMatch) {
        errorDetails.statusCode = parseInt(statusCodeMatch[1], 10);
      }

      // 尝试提取响应内容
      const responseMatch = errorMessage.match(/API 返回错误\s*\(\d{3}\)[：:]\s*([\s\S]*)/);
      if (responseMatch) {
        const responseContent = responseMatch[1].trim();
        try {
          errorDetails.responseBody = JSON.parse(responseContent);
        } catch {
          if (responseContent) {
            errorDetails.responseBody = responseContent;
          }
        }
      }

      return {
        error: errorMessage,
        errorDetails,
      };
    }

    return {
      imageData: result.imageData,
      text: result.text,
    };
  } catch (error) {
    console.error("[imageService] Tauri invoke error:", error);
    const message = error instanceof Error ? error.message : String(error);

    const errorDetails: ErrorDetails = {
      name: error instanceof Error ? error.name : "Error",
      message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      model: params.model,
      provider: provider?.name || "未知",
      requestUrl: fullRequestUrl,
      requestBody,
    };

    return {
      error: message,
      errorDetails,
    };
  }
}

// 文本生成图片
export async function generateImage(
  params: ImageGenerationParams,
  nodeType: ImageNodeType,
  _abortSignal?: AbortSignal
): Promise<GenerationResponse> {
  try {
    const provider = getProviderConfig(nodeType);
    const isPro = params.model === "gemini-3-pro-image-preview";

    return await invokeGemini(
      {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || "1:1",
        imageSize: isPro ? params.imageSize : undefined,
      },
      { name: provider.name, protocol: provider.protocol }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "已取消" };
    }
    const message = error instanceof Error ? error.message : "生成失败";
    return { error: message };
  }
}

// 图片编辑（支持多图输入）
export async function editImage(
  params: ImageEditParams,
  nodeType: ImageNodeType,
  _abortSignal?: AbortSignal
): Promise<GenerationResponse> {
  console.log("[imageService] editImage called, images count:", params.inputImages?.length || 0);

  try {
    const provider = getProviderConfig(nodeType);
    const isPro = params.model === "gemini-3-pro-image-preview";

    return await invokeGemini(
      {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        inputImages: params.inputImages,
        aspectRatio: params.aspectRatio || "1:1",
        imageSize: isPro ? params.imageSize : undefined,
      },
      { name: provider.name, protocol: provider.protocol }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "已取消" };
    }
    const message = error instanceof Error ? error.message : "编辑失败";
    return { error: message };
  }
}
