/**
 * 视频生成框架 - 类型定义
 */

import type { ProviderProtocol, ErrorDetails } from "@/types";

/**
 * 视频生成能力枚举
 */
export type VideoGenerationCapability =
  | "text-to-video" // 文生视频
  | "image-to-video"; // 图生视频（首帧参考）

/**
 * 视频任务阶段
 */
export type VideoTaskStage = "queued" | "in_progress" | "completed" | "failed";

/**
 * 视频尺寸类型
 */
export type VideoSizeType = "1280x720" | "720x1280" | "1792x1024" | "1024x1792";

/**
 * 视频时长类型
 */
export type VideoDurationType = "10" | "15" | "25";

/**
 * 视频生成请求参数（通用）
 */
export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  inputImage?: string; // base64 首帧参考图
  seconds?: VideoDurationType; // 视频时长
  size?: VideoSizeType; // 视频尺寸
}

/**
 * 视频任务创建响应
 */
export interface VideoTaskResponse {
  taskId?: string;
  status?: VideoTaskStage;
  progress?: number;
  error?: string;
  errorDetails?: ErrorDetails;
}

/**
 * 视频生成完整响应
 */
export interface VideoGenerationResponse {
  taskId?: string;
  status?: VideoTaskStage;
  progress?: number;
  videoData?: string; // base64 视频数据
  videoUrl?: string; // Blob URL
  error?: string;
  errorDetails?: ErrorDetails;
}

/**
 * 视频进度信息
 */
export interface VideoProgressInfo {
  progress: number;
  stage: VideoTaskStage;
  taskId: string;
}

/**
 * 提供商配置
 */
export interface VideoProviderConfig {
  apiKey: string;
  baseUrl: string;
  protocol: ProviderProtocol;
  name: string;
}

/**
 * 视频生成提供商接口
 */
export interface VideoGenerationProvider {
  /** 提供商唯一标识 */
  readonly id: string;

  /** 提供商显示名称 */
  readonly name: string;

  /** 支持的协议类型 */
  readonly protocol: ProviderProtocol;

  /** 支持的能力列表 */
  readonly capabilities: VideoGenerationCapability[];

  /** 支持的视频尺寸选项 */
  readonly supportedSizes: VideoSizeType[];

  /** 支持的视频时长选项 */
  readonly supportedDurations: VideoDurationType[];

  /** 是否支持首帧参考图 */
  readonly supportsInputImage: boolean;

  /**
   * 创建视频生成任务
   */
  createTask(
    request: VideoGenerationRequest,
    config: VideoProviderConfig,
    abortSignal?: AbortSignal
  ): Promise<VideoTaskResponse>;

  /**
   * 获取任务状态
   */
  getTaskStatus(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<VideoTaskResponse>;

  /**
   * 获取视频内容
   */
  getVideoContent(
    taskId: string,
    config: VideoProviderConfig
  ): Promise<{ videoData?: string; error?: string }>;

  /**
   * 验证请求参数
   */
  validateRequest(request: VideoGenerationRequest): {
    valid: boolean;
    error?: string;
  };

  /**
   * 构建 Tauri 后端请求参数
   */
  buildTauriParams(
    request: VideoGenerationRequest,
    config: VideoProviderConfig
  ): unknown;
}

/**
 * 视频节点类型
 */
export type VideoNodeType = "videoGenerator";
