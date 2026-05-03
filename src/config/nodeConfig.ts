import {
  MessageSquare,
  Sparkles,
  ImagePlus,
  Video,
  FileText,
  Presentation,
  MessageSquareText,
  FileUp,
  Film,
} from "lucide-react";
import type { NodeCategory } from "@/types";
import { getDefaultImageGeneratorData } from "@/components/nodes/imageGeneratorConfig";
import { getDefaultVideoGeneratorData } from "@/components/nodes/videoGeneratorConfig";
import { getDefaultLLMContentData } from "@/components/nodes/llmContentConfig";

// 节点分类定义 - 统一配置
export const nodeCategories: NodeCategory[] = [
  {
    id: "input",
    name: "输入",
    icon: "input",
    nodes: [
      {
        type: "promptNode",
        label: "提示词",
        description: "输入文本提示词用于图片生成",
        icon: "MessageSquare",
        defaultData: { label: "提示词", prompt: "" },
        outputs: ["prompt"],
      },
      {
        type: "imageInputNode",
        label: "图片输入",
        description: "上传图片用于图片编辑",
        icon: "ImagePlus",
        defaultData: { label: "图片输入" },
        outputs: ["image"],
      },
      {
        type: "fileUploadNode",
        label: "文件上传",
        description: "上传文件供 LLM 解析（支持图片/PDF/音频/视频）",
        icon: "FileUp",
        defaultData: { label: "文件上传" },
        outputs: ["file"],
      },
    ],
  },
  {
    id: "drawing",
    name: "绘图",
    icon: "drawing",
    nodes: [
      {
        type: "imageGeneratorNode",
        label: "绘图生成",
        description: "按接口规范选择 Gemini generateContent 或 OpenAI Images API，再选择模型",
        icon: "Sparkles",
        defaultData: getDefaultImageGeneratorData(),
        inputs: ["prompt", "image"],
        outputs: ["image"],
      },
    ],
  },
  {
    id: "video",
    name: "视频",
    icon: "video",
    nodes: [
      {
        type: "videoGeneratorNode",
        label: "视频生成",
        description: "按接口规范选择 OpenAI Videos API 或 new-api 通用视频 API，再选择模型",
        icon: "Video",
        defaultData: getDefaultVideoGeneratorData(),
        inputs: ["prompt", "image"],
        outputs: ["video"],
      },
    ],
  },
  {
    id: "text",
    name: "文本",
    icon: "text",
    nodes: [
      {
        type: "llmContentNode",
        label: "LLM 内容生成",
        description: "按接口规范选择 OpenAI、Gemini 或 Claude 内容协议，再选择模型",
        icon: "MessageSquareText",
        defaultData: getDefaultLLMContentData(),
        inputs: ["prompt", "image", "file"],
        outputs: ["prompt"],
      },
    ],
  },
  {
    id: "ppt",
    name: "PPT 工作流",
    icon: "ppt",
    nodes: [
      {
        type: "pptContentNode",
        label: "PPT 内容生成",
        description: "生成 PPT 大纲和页面图片",
        icon: "FileText",
        defaultData: {
          label: "PPT 内容生成",
          activeTab: "config",
          outlineConfig: {
            pageCountRange: "8-12",
            detailLevel: "moderate",
            additionalNotes: "",
          },
          outlineModel: "gemini-3-pro-preview",
          imageModel: "gemini-3-pro-image-preview",
          outlineStatus: "idle",
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K",
          },
          visualStyleTemplate: "academic",
          firstPageIsTitlePage: true,
          pages: [],
          generationStatus: "idle",
          progress: { completed: 0, total: 0 },
        },
        inputs: ["prompt", "image", "file"],
        outputs: ["results"],
      },
      {
        type: "pptAssemblerNode",
        label: "PPT 组装",
        description: "预览并导出 PPTX 和讲稿",
        icon: "Presentation",
        defaultData: {
          label: "PPT 组装",
          aspectRatio: "16:9",
          pages: [],
          status: "idle",
          exportMode: "image",
        },
        inputs: ["results"],
        outputs: [],
      },
    ],
  },
];

// 图标映射
export const nodeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Sparkles,
  ImagePlus,
  Video,
  FileText,
  Presentation,
  MessageSquareText,
  FileUp,
  Film,
};

// 图标颜色映射
export const nodeIconColors: Record<string, string> = {
  MessageSquare: "bg-blue-500/10 text-blue-500",
  Sparkles: "bg-purple-500/10 text-purple-500",
  ImagePlus: "bg-green-500/10 text-green-500",
  Video: "bg-cyan-500/10 text-cyan-500",
  FileText: "bg-indigo-500/10 text-indigo-500",
  Presentation: "bg-emerald-500/10 text-emerald-500",
  MessageSquareText: "bg-teal-500/10 text-teal-500",
  FileUp: "bg-orange-500/10 text-orange-500",
  Film: "bg-fuchsia-500/10 text-fuchsia-500",
};
