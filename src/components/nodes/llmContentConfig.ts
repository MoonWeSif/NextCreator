import type { Node } from "@xyflow/react";
import type { ErrorDetails, LLMModelType, NodeProviderMapping, ProviderProtocol } from "@/types";
import type { LLMGenerationParams } from "@/services/llmService";

export type LLMApiProtocol =
  | "openai-chat-completions"
  | "openai-responses"
  | "gemini-generate-content"
  | "claude-messages";

export type LLMContentStatus = "idle" | "loading" | "success" | "error";
export type LLMResponseFormat = "text" | "json_object" | "json_schema";

export interface LLMContentRunRecord {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: "loading" | "success" | "error";
  protocol: LLMApiProtocol;
  protocolLabel: string;
  model: string;
  modelLabel: string;
  input: {
    prompt: string;
    systemPrompt?: string;
    imageCount: number;
    fileCount: number;
    imageLabels?: string[];
    fileLabels?: string[];
    request: Omit<LLMGenerationParams, "files"> & {
      files?: Array<{ mimeType: string; fileName?: string; size?: string }>;
    };
  };
  output?: {
    content?: string;
    metadata?: Record<string, unknown>;
  };
  durationMs?: number;
  error?: string;
  errorDetails?: ErrorDetails;
}

export interface LLMContentNodeData {
  [key: string]: unknown;
  label: string;
  apiProtocol?: LLMApiProtocol;
  model: LLMModelType;
  prompt?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: LLMResponseFormat;
  responseJsonSchemaText?: string;
  status: LLMContentStatus;
  outputContent?: string;
  error?: string;
  errorDetails?: ErrorDetails;
  runRecords?: LLMContentRunRecord[];
}

export type LLMContentNode = Node<LLMContentNodeData>;

export interface LLMApiProtocolConfig {
  protocol: LLMApiProtocol;
  providerKey: Extract<keyof NodeProviderMapping, "llmContent">;
  providerProtocol: ProviderProtocol;
  label: string;
  shortLabel: string;
  description: string;
  defaultModel: string;
  presetModels: Array<{ value: string; label: string }>;
  accent: "primary" | "info" | "warning";
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsJsonSchema: boolean;
}

export const openAIChatPresetModels = [
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
];

export const openAIResponsesPresetModels = [
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
];

export const geminiTextPresetModels = [
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

export const claudeMessagesPresetModels = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
];

export const llmResponseFormatOptions = [
  { value: "text", label: "文本" },
  { value: "json_object", label: "JSON 对象" },
  { value: "json_schema", label: "JSON Schema" },
] as const;

export const llmApiProtocolConfigs: Record<LLMApiProtocol, LLMApiProtocolConfig> = {
  "openai-chat-completions": {
    protocol: "openai-chat-completions",
    providerKey: "llmContent",
    providerProtocol: "openai",
    label: "OpenAI Chat Completions",
    shortLabel: "Chat",
    description: "OpenAI /v1/chat/completions 消息协议",
    defaultModel: "gpt-5.4",
    presetModels: openAIChatPresetModels,
    accent: "primary",
    supportsImages: true,
    supportsFiles: false,
    supportsJsonSchema: true,
  },
  "openai-responses": {
    protocol: "openai-responses",
    providerKey: "llmContent",
    providerProtocol: "openaiResponses",
    label: "OpenAI Responses API",
    shortLabel: "Responses",
    description: "OpenAI /v1/responses 多模态响应协议",
    defaultModel: "gpt-5.4",
    presetModels: openAIResponsesPresetModels,
    accent: "primary",
    supportsImages: true,
    supportsFiles: false,
    supportsJsonSchema: true,
  },
  "gemini-generate-content": {
    protocol: "gemini-generate-content",
    providerKey: "llmContent",
    providerProtocol: "google",
    label: "Gemini generateContent",
    shortLabel: "Gemini",
    description: "Google Gemini /v1beta/models/{model}:generateContent 内容协议",
    defaultModel: "gemini-2.5-flash",
    presetModels: geminiTextPresetModels,
    accent: "info",
    supportsImages: true,
    supportsFiles: true,
    supportsJsonSchema: true,
  },
  "claude-messages": {
    protocol: "claude-messages",
    providerKey: "llmContent",
    providerProtocol: "claude",
    label: "Claude Messages API",
    shortLabel: "Claude",
    description: "Anthropic /v1/messages 消息协议",
    defaultModel: "claude-sonnet-4-5-20250929",
    presetModels: claudeMessagesPresetModels,
    accent: "warning",
    supportsImages: true,
    supportsFiles: false,
    supportsJsonSchema: false,
  },
};

export const llmApiProtocolOptions = Object.values(llmApiProtocolConfigs).map((config) => ({
  value: config.protocol,
  label: config.label,
  description: config.description,
}));

export const defaultLLMApiProtocol: LLMApiProtocol = "openai-responses";

export function getLLMApiProtocol(dataOrProtocol?: LLMContentNodeData | LLMApiProtocol | unknown): LLMApiProtocol {
  if (typeof dataOrProtocol === "string" && dataOrProtocol in llmApiProtocolConfigs) {
    return dataOrProtocol as LLMApiProtocol;
  }

  const data = dataOrProtocol as Partial<LLMContentNodeData> | undefined;
  if (data?.apiProtocol && data.apiProtocol in llmApiProtocolConfigs) {
    return data.apiProtocol;
  }

  const model = typeof data?.model === "string" ? data.model : "";
  if (model.startsWith("claude-")) return "claude-messages";
  if (model.startsWith("gemini-")) return "gemini-generate-content";

  return defaultLLMApiProtocol;
}

export function getLLMApiProtocolConfig(dataOrProtocol?: LLMContentNodeData | LLMApiProtocol | unknown): LLMApiProtocolConfig {
  return llmApiProtocolConfigs[getLLMApiProtocol(dataOrProtocol)];
}

export function getDefaultLLMContentData(protocol: LLMApiProtocol = defaultLLMApiProtocol): LLMContentNodeData {
  const config = getLLMApiProtocolConfig(protocol);
  return {
    label: "LLM 内容生成",
    apiProtocol: protocol,
    model: config.defaultModel,
    prompt: "",
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 4096,
    responseFormat: "text",
    responseJsonSchemaText: "",
    status: "idle",
  };
}

export function getLLMModelDisplayName(data: LLMContentNodeData) {
  const config = getLLMApiProtocolConfig(data);
  const model = data.model || config.defaultModel;
  const preset = config.presetModels.find((opt) => opt.value === model);
  return preset ? preset.label : model;
}

export function getLLMProtocolDisplayName(data: LLMContentNodeData) {
  return getLLMApiProtocolConfig(data).label;
}

export function parseLLMJsonSchema(schemaText?: string): Record<string, unknown> | undefined {
  const trimmed = schemaText?.trim();
  if (!trimmed) return undefined;

  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON Schema 必须是 JSON 对象");
  }

  return parsed as Record<string, unknown>;
}

export function buildLLMResponseJsonSchema(data: LLMContentNodeData): Record<string, unknown> | undefined {
  if (data.responseFormat === "json_schema") {
    return parseLLMJsonSchema(data.responseJsonSchemaText);
  }

  return undefined;
}

export function getLLMParameterLabels(data: LLMContentNodeData): string[] {
  const config = getLLMApiProtocolConfig(data);
  const labels = [
    `温度 ${Number.isFinite(data.temperature) ? data.temperature.toFixed(1) : "0.7"}`,
    `${data.maxTokens || 4096} tokens`,
  ];

  if (data.responseFormat && data.responseFormat !== "text") {
    labels.push(data.responseFormat === "json_schema" ? "JSON Schema" : "JSON");
  }

  if (!config.supportsFiles) {
    labels.push("图片输入");
  } else {
    labels.push("图文/文件");
  }

  return labels;
}

export function buildLLMGenerationParams(
  data: LLMContentNodeData,
  prompt: string,
  files?: Array<{ data: string; mimeType: string; fileName?: string }>
): LLMGenerationParams {
  const protocol = getLLMApiProtocol(data);
  const config = getLLMApiProtocolConfig(protocol);

  return {
    apiProtocol: protocol,
    prompt,
    model: data.model || config.defaultModel,
    systemPrompt: data.systemPrompt?.trim() || undefined,
    temperature: data.temperature,
    maxTokens: data.maxTokens || 4096,
    files: files && files.length > 0 ? files : undefined,
    responseFormat: data.responseFormat || "text",
    responseJsonSchema: buildLLMResponseJsonSchema(data),
  };
}
