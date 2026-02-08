/**
 * 文字去除服务
 * 使用 Gemini 检测文字 + 自适应背景修复
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ==================== 类型定义 ====================

/** 文字去除配置 */
export interface TextRemovalConfig {
  geminiBaseUrl: string;
  geminiApiKey: string;
  geminiModel: string;
}

/** 文本框数据 */
export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color?: string;
  bold?: boolean;
}

/** 文本区域数据（用于两阶段处理） */
export interface TextRegionData {
  box2d: [number, number, number, number];
  label: string;
  polygon: number[][];
}

/** 文字去除结果 */
interface TextRemovalResult {
  success: boolean;
  backgroundImage: string | null;
  textBoxes: TextBox[];
  error: string | null;
}

/** 文字检测结果 */
interface TextDetectionResult {
  success: boolean;
  regions: TextRegionData[];
  error: string | null;
}

/** 背景修复结果 */
interface InpaintResult {
  success: boolean;
  backgroundImage: string | null;
  error: string | null;
}

// ==================== 文字去除 ====================

/**
 * 从图片中去除文字
 * @param imageData base64 编码的图片
 * @param config Gemini 配置
 * @returns 处理结果
 */
export async function removeTextFromImage(
  imageData: string,
  config: TextRemovalConfig
): Promise<{ backgroundImage: string; textBoxes: TextBox[] }> {
  const result = await invoke<TextRemovalResult>("remove_text_from_image", {
    params: {
      imageData,
      geminiBaseUrl: config.geminiBaseUrl,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
    },
  });

  if (!result.success || !result.backgroundImage) {
    throw new Error(result.error || "处理失败");
  }

  return {
    backgroundImage: result.backgroundImage,
    textBoxes: result.textBoxes,
  };
}

/**
 * 阶段一：检测文字区域
 * @param imageData base64 编码的图片
 * @param config Gemini 配置
 * @returns 检测到的文字区域
 */
export async function detectTextRegions(
  imageData: string,
  config: TextRemovalConfig
): Promise<TextRegionData[]> {
  const result = await invoke<TextDetectionResult>("detect_text_regions", {
    params: {
      imageData,
      geminiBaseUrl: config.geminiBaseUrl,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
    },
  });

  if (!result.success) {
    throw new Error(result.error || "文字检测失败");
  }

  return result.regions;
}

/**
 * 阶段二：背景修复
 * @param imageData base64 编码的图片
 * @param regions 检测到的文字区域
 * @returns 修复后的背景图
 */
export async function inpaintBackground(
  imageData: string,
  regions: TextRegionData[]
): Promise<string> {
  const result = await invoke<InpaintResult>("inpaint_background", {
    params: {
      imageData,
      regions,
    },
  });

  if (!result.success || !result.backgroundImage) {
    throw new Error(result.error || "背景修复失败");
  }

  return result.backgroundImage;
}


// ==================== 批量处理（后端并发） ====================

/** 批量处理页面输入 */
export interface BatchPageInput {
  pageIndex: number;
  imageData: string;
}

/** 批量处理配置 */
export interface BatchProcessConfig {
  geminiBaseUrl: string;
  geminiApiKey: string;
  geminiModel: string;
}

/** 页面处理进度事件 */
export interface PageProgressEvent {
  pageIndex: number;
  status: 'detecting' | 'inpainting' | 'completed' | 'error';
  error?: string;
  backgroundImage?: string;
  regionsCount?: number;
  textBoxes?: TextBox[];
  imageWidth?: number;
  imageHeight?: number;
}

/** 批量处理完成事件 */
export interface BatchCompleteEvent {
  success: boolean;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}

/** 批量处理结果 */
interface BatchProcessResult {
  success: boolean;
  message: string;
}

/**
 * 批量处理页面（后端并发执行）
 * @param pages 待处理的页面列表
 * @param config 处理配置
 * @param onProgress 页面进度回调
 * @param onComplete 完成回调
 * @returns 清理函数
 */
export async function processPagesBatch(
  pages: BatchPageInput[],
  config: BatchProcessConfig,
  onProgress?: (event: PageProgressEvent) => void,
  onComplete?: (event: BatchCompleteEvent) => void
): Promise<{ cleanup: () => void; result: Promise<BatchProcessResult> }> {
  const unlisteners: UnlistenFn[] = [];

  // 监听页面进度事件
  if (onProgress) {
    const unlisten = await listen<PageProgressEvent>(
      "batch-page-progress",
      (event) => {
        onProgress(event.payload);
      }
    );
    unlisteners.push(unlisten);
  }

  // 监听完成事件
  if (onComplete) {
    const unlisten = await listen<BatchCompleteEvent>(
      "batch-complete",
      (event) => {
        onComplete(event.payload);
      }
    );
    unlisteners.push(unlisten);
  }

  // 清理函数
  const cleanup = () => {
    unlisteners.forEach((unlisten) => unlisten());
  };

  // 调用后端命令
  const result = invoke<BatchProcessResult>("process_pages_batch", {
    params: {
      pages,
      geminiBaseUrl: config.geminiBaseUrl,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
    },
  }).finally(cleanup);

  return { cleanup, result };
}

/**
 * 停止批量处理
 */
export async function stopBatchProcessing(): Promise<void> {
  await invoke("stop_batch_processing");
}
