/**
 * 图片生成框架 - 统一导出
 */

// 服务入口
export {
  generateImage,
  editImage,
  initializeImageGenerationProviders,
  getProviderCapabilities,
} from "./imageGenerationService";

// 注册表
export { imageGenerationRegistry } from "./registry";

// 类型
export type {
  ImageGenerationCapability,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationProvider,
  ProviderConfig,
  ImageNodeType,
} from "./types";

// 提供商
export { geminiImageProvider, GeminiImageProvider } from "./providers";
