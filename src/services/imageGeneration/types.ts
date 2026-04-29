/**
 * 图片生成框架 - 类型定义
 */

import type { ProviderProtocol, ErrorDetails } from "@/types";

/**
 * 图片生成能力枚举
 */
export type ImageGenerationCapability =
  | "text-to-image" // 文生图
  | "image-editing" // 图片编辑（需要输入图片）
  | "inpainting" // 局部重绘
  | "outpainting" // 扩展绘制
  | "upscale" // 超分辨率
  | "variation"; // 变体生成

/**
 * 图片生成请求参数（通用）
 */
export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  inputImages?: string[]; // base64 图片数组
  maskImage?: string; // base64 蒙版图片，仅用于支持蒙版的编辑接口
  aspectRatio?: string; // 宽高比
  imageSize?: string; // 分辨率
  size?: string; // OpenAI Images API 的显式尺寸，如 1024x1024 或 auto
  quality?: string; // 渲染质量，如 low/medium/high/auto
  background?: string; // 背景模式，如 auto/opaque/transparent
  outputFormat?: string; // 输出格式，如 png/jpeg/webp
  outputCompression?: number; // jpeg/webp 压缩比例 0-100
  moderation?: string; // 内容审核强度，如 auto/low
  inputFidelity?: string; // 输入图保真度，GPT Image 2 会自动高保真且不允许传入
  negativePrompt?: string; // 负面提示词（部分供应商支持）
  seed?: number; // 随机种子
  steps?: number; // 生成步数
  guidanceScale?: number; // 引导强度
  style?: string; // 风格预设
}

/**
 * 图片生成响应（通用）
 */
export interface ImageGenerationResponse {
  imageData?: string; // base64 图片数据
  text?: string; // 附带文本（如 Gemini 的描述）
  error?: string;
  errorDetails?: ErrorDetails;
  metadata?: {
    // 生成元数据
    model: string;
    seed?: number;
    revisedPrompt?: string; // 修正后的提示词（DALL-E 特性）
  };
}

/**
 * 提供商配置
 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  protocol: ProviderProtocol;
  name: string;
}

/**
 * 图片生成提供商接口
 */
export interface ImageGenerationProvider {
  /** 提供商唯一标识 */
  readonly id: string;

  /** 提供商显示名称 */
  readonly name: string;

  /** 支持的协议类型 */
  readonly protocol: ProviderProtocol;

  /** 支持的能力列表 */
  readonly capabilities: ImageGenerationCapability[];

  /** 支持的宽高比选项 */
  readonly supportedAspectRatios: string[];

  /** 支持的分辨率选项（可选） */
  readonly supportedImageSizes?: string[];

  /** 是否支持多图输入 */
  readonly supportsMultipleInputImages: boolean;

  /** 最大输入图片数量 */
  readonly maxInputImages: number;

  /**
   * 生成图片
   */
  generate(
    request: ImageGenerationRequest,
    config: ProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<ImageGenerationResponse>;

  /**
   * 验证请求参数
   */
  validateRequest(request: ImageGenerationRequest): {
    valid: boolean;
    error?: string;
  };

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(
    request: ImageGenerationRequest,
    config: ProviderConfig
  ): unknown;
}

/**
 * 图片节点类型
 */
export type ImageNodeType = "imageGeneratorPro" | "imageGeneratorFast" | "imageGeneratorNB2" | "dalleGenerator" | "fluxGenerator" | "gptImageGenerator" | "doubaoGenerator" | "zImageGenerator";
