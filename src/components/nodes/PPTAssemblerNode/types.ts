// PPT 组装节点类型定义
import type { ErrorDetails } from "@/types";
import type { TextBox, TextRegionData } from "@/services/textRemovalService";

// PPT 页面数据（从上游接收）
export interface PPTPageData {
  pageNumber: number;
  heading: string;
  points: string[];
  script: string;
  image: string;  // base64 图片 - 完整的 PPT 页面图片（用于导出）
  thumbnail?: string;  // 缩略图 base64（JPEG 格式，用于画布预览）

  // 可编辑模式处理后的数据
  processedBackground?: string;  // 处理后的背景图 base64（去除文字后）
  processedThumbnail?: string;   // 处理后的背景图缩略图
  processedTextBoxes?: TextBox[];  // 处理后的文本框（用于可编辑导出）
  processedWidth?: number;  // 原图宽度（像素）
  processedHeight?: number; // 原图高度（像素）
  // 处理状态：pending -> detecting -> inpainting -> completed/error
  processStatus?: 'pending' | 'detecting' | 'inpainting' | 'completed' | 'error';
  processError?: string;  // 处理错误信息
  // 检测到的文字区域（两阶段处理时保存）
  detectedRegions?: TextRegionData[];
}

// PPT 组装节点数据
export interface PPTAssemblerNodeData {
  [key: string]: unknown;
  label: string;

  // 幻灯片比例
  aspectRatio: "16:9" | "4:3";

  // 页面数据（从上游同步）
  pages: PPTPageData[];

  // 状态
  status: "idle" | "generating" | "processing" | "ready" | "error";
  error?: string;
  errorDetails?: ErrorDetails;  // 详细错误信息

  // === 可编辑导出功能 ===
  // 导出模式：
  // - image: 纯图片（原始图片直接嵌入）
  // - background: 可编辑（背景 + 文本框）
  exportMode: "image" | "background";

  // 处理进度（当前处理页面索引和详细步骤）
  processingProgress?: {
    current: number;
    total: number;
    currentStep?: 'detecting' | 'inpainting';  // 当前步骤：文字检测 或 背景修复
  } | null;
}

// 处理后的页面数据（用于可编辑 PPT 导出）
export interface ProcessedPage {
  backgroundImage: string;  // 去除文字后的背景图 base64
  textBoxes: TextBox[];     // 检测到的文本框列表
  sourceWidth?: number;     // 原图宽度（像素）
  sourceHeight?: number;    // 原图高度（像素）
  originalPage?: PPTPageData;  // 原始页面数据（用于获取 script 等）
}
