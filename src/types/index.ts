import type { Node, Edge } from "@xyflow/react";
import type { ImageGeneratorNodeData } from "@/components/nodes/imageGeneratorConfig";
import type { VideoGeneratorNodeData } from "@/components/nodes/videoGeneratorConfig";
import type { LLMContentNodeData } from "@/components/nodes/llmContentConfig";

// 详细错误信息结构
export interface ErrorDetails {
  name?: string;           // 错误名称（如 API_Error, NetworkError）
  message: string;         // 错误消息
  stack?: string;          // 堆栈信息
  cause?: unknown;         // 错误原因
  statusCode?: number;     // HTTP 状态码
  requestUrl?: string;     // 请求路径
  requestBody?: unknown;   // 请求体
  responseHeaders?: Record<string, string>;  // 响应头
  responseBody?: unknown;  // 响应内容
  timestamp?: string;      // 错误发生时间
  nodeId?: string;         // 发生错误的节点 ID
  model?: string;          // 使用的模型
  provider?: string;       // 使用的供应商
}

// 模型类型（图片生成）- 支持自定义模型名称
export type ModelType = string;

// 视频模型类型 - 支持自定义模型名称
export type VideoModelType = string;

// 视频尺寸类型（兼容旧节点数据，统一视频节点使用 videoGeneratorConfig 中的协议配置）
export type VideoSizeType = string;

// LLM 模型类型（支持自定义模型名称）
export type LLMModelType = string;

// 视频生成参数（兼容旧调用类型）
export interface VideoGenerationParams {
  prompt: string;
  model: VideoModelType;
  seconds?: string;
  size?: VideoSizeType;
  inputImage?: string; // base64 编码的参考图片
}

// 视频任务状态响应
export interface VideoTaskResponse {
  id: string;
  object: string;
  model: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  created_at: number;
  seconds: string;
  completed_at?: number;
  expires_at?: number;
  size?: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}

// 视频生成响应
export interface VideoGenerationResponse {
  taskId?: string;
  videoUrl?: string;
  videoData?: string; // base64 编码的视频数据
  status?: VideoTaskResponse["status"];
  progress?: number;
  error?: string;
  errorDetails?: ErrorDetails;  // 详细错误信息
}

// 图片生成参数
export interface ImageGenerationParams {
  prompt: string;
  model: ModelType;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3" | "5:4" | "4:5" | "21:9" | "1:4" | "4:1" | "1:8" | "8:1";
  imageSize?: "512" | "1K" | "2K" | "4K";
  responseModalities?: ("TEXT" | "IMAGE")[];
}

// 图片编辑参数
export interface ImageEditParams extends ImageGenerationParams {
  inputImages?: string[]; // base64 编码的图片数组（支持多图输入）
}

// API 响应
export interface GenerationResponse {
  imageData?: string; // base64 编码的图片数据
  text?: string;
  error?: string;
  errorDetails?: ErrorDetails;  // 详细错误信息
}

// 节点数据类型 - 添加索引签名以满足 React Flow 的 Record<string, unknown> 约束
export interface PromptNodeData {
  [key: string]: unknown;
  label: string;
  prompt: string;
}

export type { ImageGeneratorNodeData } from "@/components/nodes/imageGeneratorConfig";

export interface ImageInputNodeData {
  [key: string]: unknown;
  label: string;
  imageData?: string;
  fileName?: string;
  imagePath?: string;
  maskImageData?: string;
  maskImagePath?: string;
  hasMask?: boolean;
}

export interface TextOutputNodeData {
  [key: string]: unknown;
  label: string;
  text?: string;
}

export type { VideoGeneratorNodeData } from "@/components/nodes/videoGeneratorConfig";

// LLM 内容生成节点数据
export type { LLMContentNodeData } from "@/components/nodes/llmContentConfig";

// 文件上传节点数据
export interface FileUploadNodeData {
  [key: string]: unknown;
  label: string;
  fileData?: string;      // base64 编码的文件内容
  fileName?: string;      // 文件名
  mimeType?: string;      // MIME 类型
  fileSize?: number;      // 文件大小（字节）
}

// PPT 内容节点相关类型（从 PPTContentNode/types.ts 重新导出）
export type { PPTOutline, PPTPageStatus, PPTPageItem, PPTContentNodeData } from "@/components/nodes/PPTContentNode/types";

// PPT 组装节点相关类型（从 PPTAssemblerNode/types.ts 重新导出）
export type { PPTPageData, PPTAssemblerNodeData } from "@/components/nodes/PPTAssemblerNode/types";

// 节点类型联合
export type CustomNodeData =
  | PromptNodeData
  | ImageGeneratorNodeData
  | ImageInputNodeData
  | TextOutputNodeData
  | VideoGeneratorNodeData
  | LLMContentNodeData
  | FileUploadNodeData;

// 自定义节点类型
export type CustomNode = Node<CustomNodeData>;
export type CustomEdge = Edge;

// 节点分类定义
export interface NodeCategory {
  id: string;
  name: string;
  icon: string;
  nodes: NodeDefinition[];
}

export interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultData: Record<string, unknown>;
  inputs?: string[];
  outputs?: string[];
}

// 供应商协议类型
export type ProviderProtocol = 'openai' | 'openaiResponses' | 'google' | 'claude';

// 供应商配置
export interface Provider {
  id: string;           // 唯一标识 (uuid)
  name: string;         // 供应商名称
  apiKey: string;       // API Key
  baseUrl: string;      // Base URL（不包含版本路径如 /v1beta）
  protocol: ProviderProtocol;  // API 协议类型
}

// 节点类型到供应商的映射
export interface NodeProviderMapping {
  imageGeneratorPro?: string;   // Gemini Pro 图片协议使用的供应商 ID
  imageGeneratorFast?: string;  // Gemini Fast 图片协议使用的供应商 ID
  imageGeneratorNB2?: string;   // Gemini generateContent 图片协议使用的供应商 ID
  dalleGenerator?: string;      // 旧版 DALL-E 图片节点使用的供应商 ID
  fluxGenerator?: string;       // Flux 图片节点使用的供应商 ID
  gptImageGenerator?: string;   // OpenAI Images API 图片协议使用的供应商 ID
  doubaoGenerator?: string;     // 豆包图片节点使用的供应商 ID
  zImageGenerator?: string;     // Z-Image 图片节点使用的供应商 ID
  videoGenerator?: string;      // 视频节点使用的供应商 ID
  newApiVideoGenerator?: string; // new-api 通用视频协议使用的供应商 ID
  veoGenerator?: string;        // Veo 视频节点使用的供应商 ID
  klingGenerator?: string;      // Kling 视频节点使用的供应商 ID
  llm?: string;                 // PPT 内容生成节点使用的 LLM 供应商 ID
  llmContent?: string;          // LLM 内容生成节点使用的供应商 ID
}

// 节点类型允许的协议映射
export const NODE_ALLOWED_PROTOCOLS: Record<keyof NodeProviderMapping, ProviderProtocol[]> = {
  imageGeneratorPro: ["google", "openai", "openaiResponses"],
  imageGeneratorFast: ["google", "openai", "openaiResponses"],
  imageGeneratorNB2: ["google", "openai", "openaiResponses"],
  dalleGenerator: ["openai"],
  fluxGenerator: ["openai"],
  gptImageGenerator: ["openai"],
  doubaoGenerator: ["openai"],
  zImageGenerator: ["openai"],  // Z-Image 使用 OpenAI DALL-E 格式
  videoGenerator: ["openai"],
  newApiVideoGenerator: ["openai"],
  veoGenerator: ["openai", "google"],  // Veo 支持 OpenAI 兼容和 Google 协议
  klingGenerator: ["openai"],  // Kling 使用 OpenAI 兼容协议
  llm: ["google", "openai", "openaiResponses", "claude"],
  llmContent: ["google", "openai", "openaiResponses", "claude"],
};

// 应用设置
export interface AppSettings {
  providers: Provider[];              // 供应商列表
  nodeProviders: NodeProviderMapping; // 节点类型 -> 供应商映射
  theme: "light" | "dark" | "system";
}

// Store 状态
export interface FlowState {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedNodeId: string | null;
}

export interface SettingsState {
  settings: AppSettings;
  isSettingsOpen: boolean;
}

// 提示词相关类型（从 promptConfig.ts 重新导出）
export type { PromptCategory, PromptItem } from "@/config/promptConfig";
