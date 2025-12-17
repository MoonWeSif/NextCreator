import type { ProviderProtocol, NodeProviderMapping } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

// 预设模型选项
export interface PresetModel {
  value: string;
  label: string;
}

// 各协议的 LLM 预设模型
export const LLM_PRESET_MODELS: Record<ProviderProtocol, PresetModel[]> = {
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  ],
  openai: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5.1", label: "GPT-5.1" },
    { value: "gpt-5.2", label: "GPT-5.2" },
  ],
  claude: [
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
};

// 各协议的默认 LLM 模型
export const DEFAULT_LLM_MODELS: Record<ProviderProtocol, string> = {
  google: "gemini-3-pro-preview",
  openai: "gpt-5",
  claude: "claude-sonnet-4-5-20250929",
};

// 获取指定节点类型对应供应商的协议类型
export function getProviderProtocol(nodeType: keyof NodeProviderMapping): ProviderProtocol {
  const { settings } = useSettingsStore.getState();
  const providerId = settings.nodeProviders[nodeType];

  if (!providerId) {
    return "google";  // 默认返回 Google
  }

  const provider = settings.providers.find((p) => p.id === providerId);
  return provider?.protocol || "google";
}

// 获取指定节点类型的预设 LLM 模型列表
export function getLLMPresetModels(nodeType: keyof NodeProviderMapping): PresetModel[] {
  const protocol = getProviderProtocol(nodeType);
  return LLM_PRESET_MODELS[protocol] || LLM_PRESET_MODELS.google;
}

// 获取指定节点类型的默认 LLM 模型
export function getDefaultLLMModel(nodeType: keyof NodeProviderMapping): string {
  const protocol = getProviderProtocol(nodeType);
  return DEFAULT_LLM_MODELS[protocol] || DEFAULT_LLM_MODELS.google;
}

// React Hook: 获取指定节点类型的预设模型（响应式）
export function useLLMPresetModels(nodeType: keyof NodeProviderMapping): {
  presetModels: PresetModel[];
  defaultModel: string;
  protocol: ProviderProtocol;
} {
  const settings = useSettingsStore((state) => state.settings);
  const providerId = settings.nodeProviders[nodeType];
  const provider = settings.providers.find((p) => p.id === providerId);
  const protocol = provider?.protocol || "google";

  return {
    presetModels: LLM_PRESET_MODELS[protocol] || LLM_PRESET_MODELS.google,
    defaultModel: DEFAULT_LLM_MODELS[protocol] || DEFAULT_LLM_MODELS.google,
    protocol,
  };
}
