/**
 * 视频生成框架 - 模块导出
 */

// 类型导出
export type {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoTaskResponse,
  VideoGenerationResponse,
  VideoProviderConfig,
  VideoNodeType,
  VideoProgressInfo,
  VideoTaskStage,
  VideoSizeType,
  VideoDurationType,
  VideoGenerationCapability,
} from "./types";

// 注册表导出
export { videoGenerationRegistry } from "./registry";

// 服务导出
export {
  initializeVideoGenerationProviders,
  createVideoTask,
  getVideoTaskStatus,
  getVideoContentBlobUrl,
  downloadVideo,
  pollVideoTask,
  generateVideo,
  getVideoProviderCapabilities,
} from "./videoGenerationService";

// 提供商导出
export { soraVideoProvider, SoraVideoProvider } from "./providers";
