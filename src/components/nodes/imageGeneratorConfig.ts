import type { Node } from "@xyflow/react";
import type { ErrorDetails, ModelType, NodeProviderMapping } from "@/types";
import type { ImageGenerationRequest } from "@/services/imageGeneration";

export type ImageNodeProviderKey = Extract<
  keyof NodeProviderMapping,
  | "imageGeneratorPro"
  | "imageGeneratorFast"
  | "imageGeneratorNB2"
  | "dalleGenerator"
  | "fluxGenerator"
  | "gptImageGenerator"
  | "doubaoGenerator"
  | "zImageGenerator"
>;

export type GptImageSize = "auto" | `${number}x${number}`;
export type GptImageSizeMode = "preset" | "custom";
export type ImageApiProtocol = "gemini-generate-content" | "openai-images";
export type OpenAIImageOutputFormat = "png" | "jpeg" | "webp";
export type OpenAIImageInputFidelity = "auto" | "low" | "high";

export interface ImageGeneratorRunRecord {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: "loading" | "success" | "error";
  protocol: ImageApiProtocol;
  protocolLabel: string;
  model: string;
  modelLabel: string;
  operation: "generate" | "edit";
  input: {
    prompt: string;
    imageCount: number;
    imageLabels?: string[];
    request: ImageGenerationRequest;
  };
  output?: {
    text?: string;
    metadata?: ImageGenerationRequest | Record<string, unknown>;
    imagePaths?: string[];
    imageDataList?: string[];
  };
  durationMs?: number;
  error?: string;
  errorDetails?: ErrorDetails;
}

export interface ImageGeneratorNodeData {
  [key: string]: unknown;
  label: string;
  apiProtocol?: ImageApiProtocol;
  model: ModelType;
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
  size?: GptImageSize;
  sizeMode?: GptImageSizeMode;
  customWidth?: number;
  customHeight?: number;
  quality?: "auto" | "standard" | "hd" | "low" | "medium" | "high";
  background?: "auto" | "transparent" | "opaque";
  outputFormat?: OpenAIImageOutputFormat;
  outputCompression?: number;
  moderation?: "auto" | "low";
  inputFidelity?: OpenAIImageInputFidelity;
  n?: number;
  status: "idle" | "loading" | "success" | "error";
  outputImage?: string;
  outputImagePath?: string;
  outputImages?: string[];
  outputImagePaths?: string[];
  error?: string;
  errorDetails?: ErrorDetails;
  runRecords?: ImageGeneratorRunRecord[];
}

export type ImageGeneratorNode = Node<ImageGeneratorNodeData>;

export interface ImageApiProtocolConfig {
  protocol: ImageApiProtocol;
  providerKey: ImageNodeProviderKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultModel: string;
  presetModels: Array<{ value: string; label: string }>;
  aspectRatios?: Array<{ value: string; label: string }>;
  imageSizes?: Array<{ value: string; label: string }>;
  accent: "primary" | "info" | "warning" | "secondary" | "error";
  outputHandleClass: string;
  supportsImageInput: boolean;
  supportsMultipleImages: boolean;
  hasGeminiImageControls?: boolean;
  hasOpenAIImageControls?: boolean;
}

export const basicAspectRatioOptions = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

export const proAspectRatioOptions = [
  ...basicAspectRatioOptions,
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "5:4", label: "5:4" },
  { value: "4:5", label: "4:5" },
  { value: "21:9", label: "21:9" },
];

export const nb2AspectRatioOptions = [
  ...proAspectRatioOptions,
  { value: "1:4", label: "1:4" },
  { value: "4:1", label: "4:1" },
  { value: "1:8", label: "1:8" },
  { value: "8:1", label: "8:1" },
];

export const imageSizeOptions = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export const nb2ImageSizeOptions = [
  { value: "512", label: "512" },
  ...imageSizeOptions,
];

export const gptImagePresetModels = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
];

export const gptImageQualityOptions = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
] as const;

export const gptImage2SizePresetOptions: Array<{ value: GptImageSize | "custom"; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "1024x1024", label: "1:1 1024" },
  { value: "2048x2048", label: "1:1 2048" },
  { value: "2880x2880", label: "1:1 最大" },
  { value: "1536x864", label: "16:9 1536" },
  { value: "2048x1152", label: "16:9 2048" },
  { value: "3840x2160", label: "16:9 4K" },
  { value: "864x1536", label: "9:16 1536" },
  { value: "1152x2048", label: "9:16 2048" },
  { value: "2160x3840", label: "9:16 4K" },
  { value: "1536x1152", label: "4:3 1536" },
  { value: "1152x1536", label: "3:4 1536" },
  { value: "1536x1024", label: "3:2 1536" },
  { value: "1024x1536", label: "2:3 1536" },
  { value: "1600x1280", label: "5:4 1600" },
  { value: "1280x1600", label: "4:5 1600" },
  { value: "1792x768", label: "21:9 1792" },
  { value: "2304x768", label: "3:1 2304" },
  { value: "custom", label: "自定义" },
];

export const gptImageFixedSizeOptions: Array<{ value: GptImageSize; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "1024x1024", label: "1:1 1024" },
  { value: "1536x1024", label: "3:2 1536" },
  { value: "1024x1536", label: "2:3 1536" },
];

export const gptImageBackgroundOptions = [
  { value: "auto", label: "自动" },
  { value: "transparent", label: "透明" },
  { value: "opaque", label: "不透明" },
] as const;

export const gptImageOutputFormatOptions = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const;

export const gptImageModerationOptions = [
  { value: "auto", label: "标准" },
  { value: "low", label: "宽松" },
] as const;

export const gptImageInputFidelityOptions = [
  { value: "auto", label: "默认" },
  { value: "low", label: "低" },
  { value: "high", label: "高" },
] as const;

export const openAIImageCountOptions = [
  { value: "1", label: "1 张" },
  { value: "2", label: "2 张" },
  { value: "3", label: "3 张" },
  { value: "4", label: "4 张" },
] as const;

export const geminiImagePresetModels = [
  { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image / NanoBanana 2" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image / NanoBanana Pro" },
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image / NanoBanana" },
];

export const imageApiProtocolConfigs: Record<ImageApiProtocol, ImageApiProtocolConfig> = {
  "gemini-generate-content": {
    protocol: "gemini-generate-content",
    providerKey: "imageGeneratorNB2",
    label: "Gemini generateContent",
    shortLabel: "Gemini",
    description: "Google Gemini 原生 /v1beta/models/{model}:generateContent 图片协议",
    defaultModel: "gemini-3.1-flash-image-preview",
    presetModels: geminiImagePresetModels,
    aspectRatios: nb2AspectRatioOptions,
    imageSizes: nb2ImageSizeOptions,
    accent: "info",
    outputHandleClass: "!bg-blue-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasGeminiImageControls: true,
  },
  "openai-images": {
    protocol: "openai-images",
    providerKey: "gptImageGenerator",
    label: "OpenAI Images API",
    shortLabel: "Images",
    description: "OpenAI /v1/images/generations 与 /v1/images/edits 图片协议",
    defaultModel: "gpt-image-2",
    presetModels: gptImagePresetModels,
    accent: "primary",
    outputHandleClass: "!bg-lime-500",
    supportsImageInput: true,
    supportsMultipleImages: true,
    hasOpenAIImageControls: true,
  },
};

export const imageApiProtocolOptions = Object.values(imageApiProtocolConfigs).map((config) => ({
  value: config.protocol,
  label: config.label,
  description: config.description,
}));

export const defaultImageApiProtocol: ImageApiProtocol = "gemini-generate-content";

export function getImageApiProtocolFromEngine(engine?: unknown): ImageApiProtocol {
  if (engine === "gpt-image" || engine === "dalle" || engine === "flux" || engine === "doubao" || engine === "z-image") {
    return "openai-images";
  }

  return "gemini-generate-content";
}

export function getImageApiProtocol(dataOrProtocol?: ImageGeneratorNodeData | ImageApiProtocol | unknown): ImageApiProtocol {
  if (typeof dataOrProtocol === "string" && dataOrProtocol in imageApiProtocolConfigs) {
    return dataOrProtocol as ImageApiProtocol;
  }

  const data = dataOrProtocol as (Partial<ImageGeneratorNodeData> & { engine?: unknown }) | undefined;
  if (data?.apiProtocol && data.apiProtocol in imageApiProtocolConfigs) {
    return data.apiProtocol;
  }

  return getImageApiProtocolFromEngine(data?.engine);
}

export function getImageApiProtocolConfig(dataOrProtocol?: ImageGeneratorNodeData | ImageApiProtocol | unknown): ImageApiProtocolConfig {
  return imageApiProtocolConfigs[getImageApiProtocol(dataOrProtocol)];
}

export function getDefaultImageGeneratorData(protocol: ImageApiProtocol = defaultImageApiProtocol): ImageGeneratorNodeData {
  const config = getImageApiProtocolConfig(protocol);
  return {
    label: "绘图生成",
    apiProtocol: protocol,
    model: config.defaultModel,
    prompt: "",
    aspectRatio: config.aspectRatios?.[0]?.value || "1:1",
    imageSize: config.imageSizes?.[0]?.value || "1K",
    size: "auto",
    sizeMode: "preset",
    quality: "auto",
    background: "auto",
    outputFormat: "png",
    moderation: "auto",
    inputFidelity: "auto",
    n: 1,
    status: "idle",
  };
}

export function parseGptImageSize(size?: string): { width: number; height: number } | null {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) return null;

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

const gptImageSizePresetValues = new Set(
  gptImage2SizePresetOptions
    .map((opt) => opt.value)
    .filter((value): value is GptImageSize => value !== "custom")
);

const gptImageFixedSizeValues = new Set(gptImageFixedSizeOptions.map((opt) => opt.value));

export function getGeminiAspectRatioOptions(model?: string) {
  if (model === "gemini-3.1-flash-image-preview") return nb2AspectRatioOptions;
  if (model === "gemini-3-pro-image-preview") return proAspectRatioOptions;
  if (model === "gemini-2.5-flash-image") return basicAspectRatioOptions;
  return nb2AspectRatioOptions;
}

export function getGeminiImageSizeOptions(model?: string) {
  if (model === "gemini-3.1-flash-image-preview") return nb2ImageSizeOptions;
  if (model === "gemini-3-pro-image-preview") return imageSizeOptions;
  if (model === "gemini-2.5-flash-image") return undefined;
  return nb2ImageSizeOptions;
}

export function getOpenAIImageSizeOptions(model?: string) {
  return model === "gpt-image-2" ? gptImage2SizePresetOptions : gptImageFixedSizeOptions;
}

export function supportsCustomOpenAIImageSize(model?: string) {
  return model === "gpt-image-2";
}

export function getGptImageCustomDimensions(data: ImageGeneratorNodeData) {
  const parsedSize = parseGptImageSize(data.size);
  return {
    width: data.customWidth || parsedSize?.width || 1024,
    height: data.customHeight || parsedSize?.height || 1024,
  };
}

export function getGptImageSizeMode(data: ImageGeneratorNodeData): GptImageSizeMode {
  if (data.sizeMode) return data.sizeMode;
  return data.size && !gptImageSizePresetValues.has(data.size) ? "custom" : "preset";
}

function getResolvedCustomOpenAIImageSize(data: ImageGeneratorNodeData): GptImageSize {
  if (getGptImageSizeMode(data) !== "custom") {
    return data.size || "auto";
  }

  const { width, height } = getGptImageCustomDimensions(data);
  return `${width}x${height}`;
}

export function getResolvedOpenAIImageSize(data: ImageGeneratorNodeData): GptImageSize {
  if (supportsCustomOpenAIImageSize(data.model)) {
    return getResolvedCustomOpenAIImageSize(data);
  }

  const size = data.size || "auto";
  return gptImageFixedSizeValues.has(size) ? size : "auto";
}

export function validateGptImage2Size(size: GptImageSize): string | undefined {
  if (size === "auto") return undefined;

  const parsed = parseGptImageSize(size);
  if (!parsed) return "尺寸格式无效";

  const { width, height } = parsed;
  if (width <= 0 || height <= 0) return "宽高必须大于 0";
  if (width % 16 !== 0 || height % 16 !== 0) return "宽高必须是 16 的倍数";
  if (Math.max(width, height) > 3840) return "最长边不能超过 3840";
  if (Math.max(width, height) / Math.min(width, height) > 3) return "宽高比不能超过 3:1";

  const pixels = width * height;
  if (pixels < 655360) return "总像素不能低于 655,360";
  if (pixels > 8294400) return "总像素不能超过 8,294,400";

  return undefined;
}

export function getGptImageBackgroundOptions(model: string) {
  return model === "gpt-image-2"
    ? gptImageBackgroundOptions.filter((opt) => opt.value !== "transparent")
    : [...gptImageBackgroundOptions];
}

export function getImageModelDisplayName(data: ImageGeneratorNodeData) {
  const config = getImageApiProtocolConfig(data);
  const preset = config.presetModels.find((opt) => opt.value === data.model);
  return preset ? preset.label : data.model;
}

export function getImageProtocolDisplayName(data: ImageGeneratorNodeData) {
  return getImageApiProtocolConfig(data).label;
}

export function getImageGeneratorSizeLabel(data: ImageGeneratorNodeData): string {
  const config = getImageApiProtocolConfig(data);
  const model = data.model || config.defaultModel;

  if (config.hasOpenAIImageControls) {
    return getResolvedOpenAIImageSize({ ...data, model });
  }

  if (config.hasGeminiImageControls) {
    const aspectRatioOptions = getGeminiAspectRatioOptions(model);
    const aspectRatio = aspectRatioOptions.some((opt) => opt.value === data.aspectRatio)
      ? data.aspectRatio
      : aspectRatioOptions[0]?.value;
    const imageSizeOptions = getGeminiImageSizeOptions(model);
    const imageSize = imageSizeOptions?.some((opt) => opt.value === data.imageSize)
      ? data.imageSize
      : imageSizeOptions?.[0]?.value;

    return [aspectRatio, imageSize].filter(Boolean).join(" · ") || "自动";
  }

  return data.imageSize || data.aspectRatio || "自动";
}

function getOptionLabel<T extends readonly { value: string; label: string }[]>(
  options: T,
  value?: string
) {
  return options.find((opt) => opt.value === value)?.label || value;
}

export function getImageGeneratorParameterLabels(data: ImageGeneratorNodeData): string[] {
  const config = getImageApiProtocolConfig(data);
  const model = data.model || config.defaultModel;

  if (config.hasOpenAIImageControls) {
    const outputFormat = data.outputFormat || "png";
    const labels = [
      `尺寸 ${getResolvedOpenAIImageSize({ ...data, model })}`,
      `质量 ${getOptionLabel(gptImageQualityOptions, data.quality || "auto")}`,
      `${data.n || 1} 张`,
      `背景 ${getOptionLabel(getGptImageBackgroundOptions(model), data.background || "auto")}`,
      `格式 ${getOptionLabel(gptImageOutputFormatOptions, outputFormat)}`,
      `审核 ${getOptionLabel(gptImageModerationOptions, data.moderation || "auto")}`,
    ];

    if ((outputFormat === "jpeg" || outputFormat === "webp") && typeof data.outputCompression === "number") {
      labels.push(`压缩 ${data.outputCompression}`);
    }

    if (model !== "gpt-image-2" && data.inputFidelity && data.inputFidelity !== "auto") {
      labels.push(`保真 ${getOptionLabel(gptImageInputFidelityOptions, data.inputFidelity)}`);
    }

    return labels;
  }

  if (config.hasGeminiImageControls) {
    const aspectRatioOptions = getGeminiAspectRatioOptions(model);
    const aspectRatio = aspectRatioOptions.some((opt) => opt.value === data.aspectRatio)
      ? data.aspectRatio
      : aspectRatioOptions[0]?.value;
    const imageSizeOptions = getGeminiImageSizeOptions(model);
    const imageSize = imageSizeOptions?.some((opt) => opt.value === data.imageSize)
      ? data.imageSize
      : imageSizeOptions?.[0]?.value;

    return [
      aspectRatio ? `比例 ${aspectRatio}` : undefined,
      imageSize ? `尺寸 ${imageSize}` : undefined,
    ].filter((label): label is string => Boolean(label));
  }

  return [getImageGeneratorSizeLabel(data)];
}

export function buildImageGenerationRequest(
  data: ImageGeneratorNodeData,
  prompt: string,
  inputImages?: string[],
  maskImage?: string
): ImageGenerationRequest {
  const config = getImageApiProtocolConfig(data);
  const base: ImageGenerationRequest = {
    prompt,
    model: data.model || config.defaultModel,
    apiProtocol: config.protocol,
    inputImages,
    maskImage,
    aspectRatio: data.aspectRatio,
  };

  if (config.hasGeminiImageControls) {
    const aspectRatioOptionsForModel = getGeminiAspectRatioOptions(base.model);
    const imageSizeOptionsForModel = getGeminiImageSizeOptions(base.model);
    const aspectRatio = aspectRatioOptionsForModel.some((opt) => opt.value === data.aspectRatio)
      ? data.aspectRatio
      : aspectRatioOptionsForModel[0]?.value;

    return {
      ...base,
      aspectRatio,
      imageSize: imageSizeOptionsForModel
        ? imageSizeOptionsForModel.some((opt) => opt.value === data.imageSize)
          ? data.imageSize
          : imageSizeOptionsForModel[0]?.value
        : undefined,
    };
  }

  if (config.hasOpenAIImageControls) {
    const outputFormat = data.outputFormat || "png";
    const inputFidelity = data.inputFidelity && data.inputFidelity !== "auto" && base.model !== "gpt-image-2"
      ? data.inputFidelity
      : undefined;

    return {
      ...base,
      size: getResolvedOpenAIImageSize({ ...data, model: base.model }),
      quality: data.quality || "auto",
      background: data.background || "auto",
      outputFormat,
      outputCompression: outputFormat === "jpeg" || outputFormat === "webp"
        ? data.outputCompression ?? 100
        : undefined,
      moderation: data.moderation || "auto",
      inputFidelity,
      n: data.n || 1,
    };
  }

  return base;
}
