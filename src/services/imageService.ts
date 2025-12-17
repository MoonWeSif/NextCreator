import { GoogleGenAI } from "@google/genai";
import { invoke } from "@tauri-apps/api/core";
import type { ImageGenerationParams, ImageEditParams, GenerationResponse, ProviderProtocol } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

// 图片节点类型
type ImageNodeType = "imageGeneratorPro" | "imageGeneratorFast";

// 检测是否在 Tauri 环境中（Tauri 2.0）
const isTauri = () => {
  const result = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  console.log("[imageService] isTauri check:", result, "window keys:", typeof window !== "undefined" ? Object.keys(window).filter(k => k.includes("TAURI")) : []);
  return result;
};

// 根据协议类型获取完整的 API Base URL
function getApiBaseUrl(baseUrl: string, protocol: ProviderProtocol): string {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");  // 移除末尾斜杠

  switch (protocol) {
    case "google":
      return `${cleanBaseUrl}/v1beta`;
    case "openai":
      return `${cleanBaseUrl}/v1`;
    case "claude":
      return `${cleanBaseUrl}/v1`;
    default:
      return `${cleanBaseUrl}/v1beta`;
  }
}

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

// 创建 API 客户端（仅用于 Web 环境）
function createClient(nodeType: ImageNodeType) {
  const provider = getProviderConfig(nodeType);
  const apiBaseUrl = getApiBaseUrl(provider.baseUrl, provider.protocol);

  return new GoogleGenAI({
    apiKey: provider.apiKey,
    httpOptions: {
      baseUrl: apiBaseUrl,
    },
  });
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
async function invokeGemini(params: TauriGeminiParams): Promise<GenerationResponse> {
  console.log("[imageService] invokeGemini called, sending to Tauri backend...");
  console.log("[imageService] params:", { ...params, inputImages: params.inputImages?.length || 0, apiKey: "***" });

  try {
    const startTime = Date.now();
    const result = await invoke<TauriGeminiResult>("gemini_generate_content", { params });
    const elapsed = Date.now() - startTime;

    console.log("[imageService] Tauri backend response received in", elapsed, "ms");
    console.log("[imageService] result:", { success: result.success, hasImage: !!result.imageData, error: result.error });

    if (!result.success) {
      return { error: result.error || "请求失败" };
    }

    return {
      imageData: result.imageData,
      text: result.text,
    };
  } catch (error) {
    console.error("[imageService] Tauri invoke error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

// 文本生成图片
export async function generateImage(
  params: ImageGenerationParams,
  nodeType: ImageNodeType,
  abortSignal?: AbortSignal
): Promise<GenerationResponse> {
  try {
    const provider = getProviderConfig(nodeType);
    const isPro = params.model === "gemini-3-pro-image-preview";
    const apiBaseUrl = getApiBaseUrl(provider.baseUrl, provider.protocol);

    // 在 Tauri 环境中使用后端代理
    if (isTauri()) {
      return await invokeGemini({
        baseUrl: apiBaseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || "1:1",
        imageSize: isPro ? params.imageSize : undefined,
      });
    }

    // Web 环境使用 SDK
    const client = createClient(nodeType);

    const response = await client.models.generateContent({
      model: params.model,
      contents: [{ parts: [{ text: params.prompt }] }],
      config: {
        responseModalities: params.responseModalities || ["IMAGE"],
        imageConfig: {
          aspectRatio: params.aspectRatio || "1:1",
          ...(isPro && params.imageSize ? { imageSize: params.imageSize } : {}),
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

    return { imageData, text };
  } catch (error) {
    // 检查是否是中断错误
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
  abortSignal?: AbortSignal
): Promise<GenerationResponse> {
  console.log("[imageService] editImage called, images count:", params.inputImages?.length || 0);

  try {
    const provider = getProviderConfig(nodeType);
    const isPro = params.model === "gemini-3-pro-image-preview";
    const apiBaseUrl = getApiBaseUrl(provider.baseUrl, provider.protocol);

    // 在 Tauri 环境中使用后端代理
    if (isTauri()) {
      console.log("[imageService] Using Tauri backend proxy");
      return await invokeGemini({
        baseUrl: apiBaseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        inputImages: params.inputImages,
        aspectRatio: params.aspectRatio || "1:1",
        imageSize: isPro ? params.imageSize : undefined,
      });
    }

    console.log("[imageService] Using browser SDK (not Tauri)");
    // Web 环境使用 SDK
    const client = createClient(nodeType);

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: params.prompt },
    ];

    // 添加所有输入图片
    if (params.inputImages && params.inputImages.length > 0) {
      for (const imageData of params.inputImages) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: imageData,
          },
        });
      }
    }

    const response = await client.models.generateContent({
      model: params.model,
      contents: [{ parts }],
      config: {
        responseModalities: params.responseModalities || ["IMAGE"],
        imageConfig: {
          aspectRatio: params.aspectRatio || "1:1",
          ...(isPro && params.imageSize ? { imageSize: params.imageSize } : {}),
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

    return { imageData, text };
  } catch (error) {
    // 检查是否是中断错误
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "已取消" };
    }
    const message = error instanceof Error ? error.message : "编辑失败";
    return { error: message };
  }
}
