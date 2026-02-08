/**
 * 图片生成框架 - 统一服务入口
 */

import { imageGenerationRegistry } from "./registry";
import { geminiImageProvider, dalleImageProvider, fluxImageProvider } from "./providers";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderConfig,
  ImageNodeType,
} from "./types";

/**
 * 初始化注册所有提供商
 */
export function initializeImageGenerationProviders(): void {
  // 注册 Gemini 提供商
  imageGenerationRegistry.register(geminiImageProvider);

  // 注册 DALL-E 提供商（OpenAI Images API 格式）
  imageGenerationRegistry.register(dalleImageProvider);

  // 注册 Flux 提供商（OpenAI Images API 格式）
  imageGenerationRegistry.register(fluxImageProvider);

  console.log(
    "[ImageGenService] Providers initialized:",
    imageGenerationRegistry.getAll().map((p) => p.id)
  );
}

/**
 * 获取节点对应的供应商配置
 */
function getProviderConfig(nodeType: ImageNodeType): ProviderConfig {
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

  return {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    protocol: provider.protocol,
    name: provider.name,
  };
}

/**
 * 生成图片（统一入口）
 */
export async function generateImage(
  request: ImageGenerationRequest,
  nodeType: ImageNodeType,
  abortSignal?: AbortSignal
): Promise<ImageGenerationResponse> {
  try {
    const config = getProviderConfig(nodeType);

    // 根据协议获取对应的提供商实现
    const provider = imageGenerationRegistry.getByProtocol(config.protocol);

    if (!provider) {
      return {
        error: `不支持的协议类型: ${config.protocol}，请检查供应商配置`,
      };
    }

    console.log(
      `[ImageGenService] Using provider: ${provider.id} for ${nodeType}`
    );

    return await provider.generate(request, config, abortSignal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return { error: message };
  }
}

/**
 * 编辑图片（带输入图片的生成）
 */
export async function editImage(
  request: ImageGenerationRequest,
  nodeType: ImageNodeType,
  abortSignal?: AbortSignal
): Promise<ImageGenerationResponse> {
  // 编辑图片本质上也是调用 generate，只是带有 inputImages
  return generateImage(request, nodeType, abortSignal);
}

/**
 * 获取提供商支持的能力
 */
export function getProviderCapabilities(nodeType: ImageNodeType) {
  try {
    const config = getProviderConfig(nodeType);
    const provider = imageGenerationRegistry.getByProtocol(config.protocol);
    return provider
      ? {
          capabilities: provider.capabilities,
          supportedAspectRatios: provider.supportedAspectRatios,
          supportedImageSizes: provider.supportedImageSizes,
          supportsMultipleInputImages: provider.supportsMultipleInputImages,
          maxInputImages: provider.maxInputImages,
        }
      : null;
  } catch {
    return null;
  }
}
