/**
 * OCR + Inpaint 服务调用
 * 用于将 PPT 图片转换为可编辑文字形式
 */

import { invoke } from "@tauri-apps/api/core";
import type { PPTPageData } from "@/components/nodes/PPTAssemblerNode/types";

// ==================== 类型定义 ====================

/** 文本框数据 */
export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
}

/** 处理后的页面数据 */
export interface ProcessedPage {
  /** 去除文字后的背景图 (base64) */
  backgroundImage: string;
  /** 检测到的文本框列表 */
  textBoxes: TextBox[];
  /** 原始页面数据 */
  originalPage: PPTPageData;
}

/** 服务配置 */
export interface OcrInpaintConfig {
  /** PaddleOCR 服务地址 */
  ocrApiUrl: string;
  /** IOPaint 服务地址 */
  inpaintApiUrl: string;
  /** 蒙版扩展边距（像素） */
  maskPadding?: number;
}

/** 处理进度回调 */
export type ProgressCallback = (current: number, total: number) => void;

/** 单页处理结果（来自 Rust） */
interface ProcessPageResult {
  success: boolean;
  backgroundImage: string | null;
  textBoxes: TextBox[];
  error: string | null;
}

/** 连接测试结果 */
interface TestConnectionResult {
  success: boolean;
  message: string;
}

// ==================== 服务函数 ====================

/**
 * 处理单个 PPT 页面
 * @param imageData base64 编码的图片
 * @param config 服务配置
 * @returns 处理结果
 */
export async function processPageForEditable(
  imageData: string,
  config: OcrInpaintConfig
): Promise<{ backgroundImage: string; textBoxes: TextBox[] }> {
  const result = await invoke<ProcessPageResult>("process_ppt_page", {
    params: {
      imageData,
      ocrApiUrl: config.ocrApiUrl,
      inpaintApiUrl: config.inpaintApiUrl,
      maskPadding: config.maskPadding ?? 5,
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

/** 批量处理结果 */
export interface ProcessAllPagesResult {
  /** 是否全部成功 */
  success: boolean;
  /** 处理后的页面（仅成功时有值） */
  pages: ProcessedPage[];
  /** 错误信息（失败时） */
  error?: string;
  /** 失败的页面编号 */
  failedPageNumber?: number;
}

/**
 * 批量处理所有 PPT 页面
 * @param pages PPT 页面数据数组
 * @param config 服务配置
 * @param onProgress 进度回调
 * @returns 处理结果，包含成功/失败状态
 */
export async function processAllPages(
  pages: PPTPageData[],
  config: OcrInpaintConfig,
  onProgress?: ProgressCallback
): Promise<ProcessAllPagesResult> {
  // 先检查服务是否可用
  const servicesCheck = await checkServicesAvailable(config);

  if (!servicesCheck.ocrAvailable) {
    return {
      success: false,
      pages: [],
      error: `OCR 服务连接失败: ${servicesCheck.ocrMessage}`,
    };
  }

  if (!servicesCheck.inpaintAvailable) {
    return {
      success: false,
      pages: [],
      error: `IOPaint 服务连接失败: ${servicesCheck.inpaintMessage}`,
    };
  }

  const results: ProcessedPage[] = [];
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // 报告进度
    onProgress?.(i + 1, total);

    try {
      const processed = await processPageForEditable(page.image, config);

      results.push({
        backgroundImage: processed.backgroundImage,
        textBoxes: processed.textBoxes,
        originalPage: page,
      });
    } catch (error) {
      // 处理失败，立即停止并返回错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`第 ${page.pageNumber} 页处理失败:`, error);

      return {
        success: false,
        pages: results, // 返回已处理的页面
        error: `第 ${page.pageNumber} 页处理失败: ${errorMessage}`,
        failedPageNumber: page.pageNumber,
      };
    }
  }

  return {
    success: true,
    pages: results,
  };
}

/**
 * 测试 OCR 服务连接
 * @param url OCR 服务地址
 */
export async function testOcrConnection(url: string): Promise<TestConnectionResult> {
  return await invoke<TestConnectionResult>("test_ocr_connection", {
    params: { url },
  });
}

/**
 * 测试 IOPaint 服务连接
 * @param url IOPaint 服务地址
 */
export async function testInpaintConnection(url: string): Promise<TestConnectionResult> {
  return await invoke<TestConnectionResult>("test_inpaint_connection", {
    params: { url },
  });
}

/**
 * 检查服务是否可用（同时测试 OCR 和 IOPaint）
 */
export async function checkServicesAvailable(config: OcrInpaintConfig): Promise<{
  ocrAvailable: boolean;
  inpaintAvailable: boolean;
  ocrMessage: string;
  inpaintMessage: string;
}> {
  const [ocrResult, inpaintResult] = await Promise.all([
    testOcrConnection(config.ocrApiUrl),
    testInpaintConnection(config.inpaintApiUrl),
  ]);

  return {
    ocrAvailable: ocrResult.success,
    inpaintAvailable: inpaintResult.success,
    ocrMessage: ocrResult.message,
    inpaintMessage: inpaintResult.message,
  };
}
