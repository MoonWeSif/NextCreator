import type { Node } from "@xyflow/react";
import type { ErrorDetails, NodeProviderMapping } from "@/types";
import type { VideoGenerationRequest, VideoTaskStatusSnapshot } from "@/services/videoGeneration";

export type VideoApiProtocol = "openai-videos" | "newapi-video-generations";
export type VideoGeneratorStatus = "idle" | "loading" | "success" | "error";
export type VideoTaskStage = "queued" | "in_progress" | "completed" | "failed";

export type OpenAIVideoSize =
  | "720x1280"
  | "1280x720"
  | "1024x1792"
  | "1792x1024"
  | "1080x1920"
  | "1920x1080";
export type OpenAIVideoSeconds = "4" | "8" | "12" | "16" | "20";
export type NewApiVideoResponseFormat = "url" | "b64_json";

export interface VideoGeneratorRunRecord {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: "loading" | "success" | "error";
  protocol: VideoApiProtocol;
  protocolLabel: string;
  model: string;
  modelLabel: string;
  input: {
    prompt: string;
    imageCount: number;
    imageLabels?: string[];
    request: VideoGenerationRequest;
  };
  output?: {
    taskId?: string;
    videoUrl?: string;
    videoData?: string;
    metadata?: Record<string, unknown>;
    statusSnapshot?: VideoTaskStatusSnapshot;
  };
  durationMs?: number;
  error?: string;
  errorDetails?: ErrorDetails;
}

export interface VideoGeneratorNodeData {
  [key: string]: unknown;
  label: string;
  apiProtocol?: VideoApiProtocol;
  model: string;
  prompt?: string;
  seconds?: OpenAIVideoSeconds;
  size?: OpenAIVideoSize | `${number}x${number}`;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  n?: number;
  responseFormat?: NewApiVideoResponseFormat;
  user?: string;
  metadataText?: string;
  status: VideoGeneratorStatus;
  taskId?: string;
  taskStage?: VideoTaskStage;
  progress?: number;
  outputVideo?: string;
  videoData?: string;
  error?: string;
  errorDetails?: ErrorDetails;
  runRecords?: VideoGeneratorRunRecord[];
}

export type VideoGeneratorNode = Node<VideoGeneratorNodeData>;

export interface VideoApiProtocolConfig {
  protocol: VideoApiProtocol;
  providerKey: Extract<keyof NodeProviderMapping, "videoGenerator" | "newApiVideoGenerator">;
  label: string;
  shortLabel: string;
  description: string;
  defaultModel: string;
  presetModels: Array<{ value: string; label: string }>;
  accent: "primary" | "info" | "warning";
  outputHandleClass: string;
  supportsImageInput: boolean;
  hasOpenAIControls?: boolean;
  hasNewApiControls?: boolean;
}

export const openAIVideoPresetModels = [
  { value: "sora-2", label: "Sora 2" },
  { value: "sora-2-pro", label: "Sora 2 Pro" },
];

export const newApiVideoPresetModels = [
  { value: "sora-2", label: "Sora 2" },
  { value: "sora-2-pro", label: "Sora 2 Pro" },
  { value: "jimeng-v3", label: "Jimeng" },
  { value: "kling-v1", label: "Kling" },
];

export const openAIVideoSecondsOptions = [
  { value: "4", label: "4 秒" },
  { value: "8", label: "8 秒" },
  { value: "12", label: "12 秒" },
  { value: "16", label: "16 秒" },
  { value: "20", label: "20 秒" },
] as const;

export const openAIVideoSizeOptions = [
  { value: "1280x720", label: "16:9 720p" },
  { value: "720x1280", label: "9:16 720p" },
  { value: "1792x1024", label: "16:9 Pro" },
  { value: "1024x1792", label: "9:16 Pro" },
  { value: "1920x1080", label: "16:9 1080p" },
  { value: "1080x1920", label: "9:16 1080p" },
] as const;

export const newApiDurationOptions = [
  { value: "5", label: "5 秒" },
  { value: "8", label: "8 秒" },
  { value: "10", label: "10 秒" },
  { value: "15", label: "15 秒" },
] as const;

export const newApiResolutionOptions = [
  { value: "1280x720", label: "1280x720" },
  { value: "720x1280", label: "720x1280" },
  { value: "1920x1080", label: "1920x1080" },
  { value: "1080x1920", label: "1080x1920" },
] as const;

export const newApiFpsOptions = [
  { value: "24", label: "24 fps" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
] as const;

export const newApiVideoCountOptions = [
  { value: "1", label: "1 个" },
  { value: "2", label: "2 个" },
  { value: "3", label: "3 个" },
  { value: "4", label: "4 个" },
] as const;

export const newApiResponseFormatOptions = [
  { value: "url", label: "URL" },
  { value: "b64_json", label: "Base64" },
] as const;

export const videoApiProtocolConfigs: Record<VideoApiProtocol, VideoApiProtocolConfig> = {
  "openai-videos": {
    protocol: "openai-videos",
    providerKey: "videoGenerator",
    label: "OpenAI Videos API",
    shortLabel: "Videos",
    description: "OpenAI /v1/videos 异步视频生成协议",
    defaultModel: "sora-2",
    presetModels: openAIVideoPresetModels,
    accent: "primary",
    outputHandleClass: "canvas-node-minimal-handle canvas-node-minimal-handle-output",
    supportsImageInput: true,
    hasOpenAIControls: true,
  },
  "newapi-video-generations": {
    protocol: "newapi-video-generations",
    providerKey: "newApiVideoGenerator",
    label: "new-api 通用视频 API",
    shortLabel: "New API",
    description: "new-api /v1/video/generations 通用视频任务协议",
    defaultModel: "kling-v1",
    presetModels: newApiVideoPresetModels,
    accent: "info",
    outputHandleClass: "canvas-node-minimal-handle canvas-node-minimal-handle-output",
    supportsImageInput: true,
    hasNewApiControls: true,
  },
};

export const videoApiProtocolOptions = Object.values(videoApiProtocolConfigs).map((config) => ({
  value: config.protocol,
  label: config.label,
  description: config.description,
}));

export const defaultVideoApiProtocol: VideoApiProtocol = "openai-videos";

export function getVideoApiProtocol(dataOrProtocol?: VideoGeneratorNodeData | VideoApiProtocol | unknown): VideoApiProtocol {
  if (typeof dataOrProtocol === "string" && dataOrProtocol in videoApiProtocolConfigs) {
    return dataOrProtocol as VideoApiProtocol;
  }

  const data = dataOrProtocol as Partial<VideoGeneratorNodeData> | undefined;
  if (data?.apiProtocol && data.apiProtocol in videoApiProtocolConfigs) {
    return data.apiProtocol;
  }

  return defaultVideoApiProtocol;
}

export function getVideoApiProtocolConfig(dataOrProtocol?: VideoGeneratorNodeData | VideoApiProtocol | unknown): VideoApiProtocolConfig {
  return videoApiProtocolConfigs[getVideoApiProtocol(dataOrProtocol)];
}

export function getDefaultVideoGeneratorData(protocol: VideoApiProtocol = defaultVideoApiProtocol): VideoGeneratorNodeData {
  const config = getVideoApiProtocolConfig(protocol);
  return {
    label: "视频生成",
    apiProtocol: protocol,
    model: config.defaultModel,
    prompt: "",
    seconds: "8",
    size: "1280x720",
    duration: 5,
    width: 1280,
    height: 720,
    fps: 30,
    n: 1,
    responseFormat: "url",
    metadataText: "",
    status: "idle",
  };
}

export function getOpenAIVideoSizeOptions(model?: string) {
  if (model === "sora-2-pro") return openAIVideoSizeOptions;
  return openAIVideoSizeOptions.filter((opt) => opt.value === "1280x720" || opt.value === "720x1280");
}

export function getNormalizedOpenAIVideoSize(data: VideoGeneratorNodeData): OpenAIVideoSize {
  const model = data.model || getVideoApiProtocolConfig("openai-videos").defaultModel;
  const options = getOpenAIVideoSizeOptions(model);
  const size = data.size || "1280x720";
  return options.some((opt) => opt.value === size) ? size as OpenAIVideoSize : options[0].value;
}

export function getNormalizedOpenAIVideoSeconds(data: VideoGeneratorNodeData): OpenAIVideoSeconds {
  const seconds = data.seconds || "8";
  return openAIVideoSecondsOptions.some((opt) => opt.value === seconds) ? seconds : "8";
}

export function parseVideoResolution(value?: string): { width: number; height: number } | null {
  const match = value?.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

export function getNewApiResolutionValue(data: VideoGeneratorNodeData): string {
  const width = data.width || 1280;
  const height = data.height || 720;
  return `${width}x${height}`;
}

export function parseVideoMetadata(metadataText?: string): Record<string, unknown> | undefined {
  const trimmed = metadataText?.trim();
  if (!trimmed) return undefined;

  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("扩展参数必须是 JSON 对象");
  }

  return parsed as Record<string, unknown>;
}

export function getVideoModelDisplayName(data: VideoGeneratorNodeData) {
  const config = getVideoApiProtocolConfig(data);
  const model = data.model || config.defaultModel;
  const preset = config.presetModels.find((opt) => opt.value === model);
  return preset ? preset.label : model;
}

export function getVideoProtocolDisplayName(data: VideoGeneratorNodeData) {
  return getVideoApiProtocolConfig(data).label;
}

function getOptionLabel<T extends readonly { value: string; label: string }[]>(
  options: T,
  value?: string
) {
  return options.find((opt) => opt.value === value)?.label || value;
}

export function getVideoGeneratorParameterLabels(data: VideoGeneratorNodeData): string[] {
  const config = getVideoApiProtocolConfig(data);

  if (config.hasOpenAIControls) {
    return [
      `尺寸 ${getNormalizedOpenAIVideoSize(data)}`,
      `时长 ${getOptionLabel(openAIVideoSecondsOptions, getNormalizedOpenAIVideoSeconds(data))}`,
    ];
  }

  const resolution = getNewApiResolutionValue(data);
  return [
    `分辨率 ${resolution}`,
    `时长 ${data.duration || 5} 秒`,
    data.fps ? `${data.fps} fps` : undefined,
    data.n && data.n > 1 ? `${data.n} 个` : undefined,
    data.seed != null ? `Seed ${data.seed}` : undefined,
    data.responseFormat ? `返回 ${getOptionLabel(newApiResponseFormatOptions, data.responseFormat)}` : undefined,
  ].filter((label): label is string => Boolean(label));
}

export function buildVideoGenerationRequest(
  data: VideoGeneratorNodeData,
  prompt: string,
  inputImages?: string[]
): VideoGenerationRequest {
  const config = getVideoApiProtocolConfig(data);
  const model = data.model || config.defaultModel;
  const base: VideoGenerationRequest = {
    apiProtocol: config.protocol,
    prompt,
    model,
    inputImage: inputImages?.find((image) => image.trim().length > 0),
  };

  if (config.hasOpenAIControls) {
    return {
      ...base,
      seconds: getNormalizedOpenAIVideoSeconds(data),
      size: getNormalizedOpenAIVideoSize({ ...data, model }),
    };
  }

  return {
    ...base,
    duration: data.duration || 5,
    width: data.width || 1280,
    height: data.height || 720,
    fps: data.fps || 30,
    seed: data.seed,
    n: data.n || 1,
    responseFormat: data.responseFormat || "url",
    user: data.user?.trim() || undefined,
    metadata: parseVideoMetadata(data.metadataText),
  };
}
