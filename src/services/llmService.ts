import { invoke } from "@tauri-apps/api/core";
import type { LLMModelType, Provider } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

// LLM 节点类型
type LLMNodeType = "llm" | "llmContent";

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// LLM 生成参数
export interface LLMGenerationParams {
  prompt: string;
  model: LLMModelType;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  onStream?: (chunk: string) => void; // 流式回调
  files?: Array<{ data: string; mimeType: string; fileName?: string }>; // 文件数据（base64）
  responseJsonSchema?: Record<string, unknown>; // 结构化输出的 JSON Schema
}

// LLM 响应
export interface LLMResponse {
  content?: string;
  error?: string;
}

// Tauri 后端请求参数
interface TauriLLMParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  files?: Array<{ data: string; mimeType: string; fileName?: string }>; // 文件数据（base64）
  responseJsonSchema?: Record<string, unknown>; // 结构化输出的 JSON Schema
}

// Tauri 后端响应
interface TauriLLMResult {
  success: boolean;
  content?: string;
  error?: string;
}

// 获取供应商配置
function getProviderConfig(nodeType: LLMNodeType) {
  const { settings } = useSettingsStore.getState();
  const providerId = settings.nodeProviders[nodeType];

  if (!providerId) {
    throw new Error(`请先在供应商管理中配置 ${nodeType === "llm" ? "PPT 内容生成" : "LLM 内容生成"}节点的供应商`);
  }

  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error("供应商不存在，请重新配置");
  }

  if (!provider.apiKey) {
    throw new Error("供应商 API Key 未配置");
  }

  return provider;
}

// 通过 Tauri 后端代理发送请求（仅支持 Gemini 格式）
async function invokeLLM(params: TauriLLMParams): Promise<LLMResponse> {
  console.log("[llmService] invokeLLM called, sending to Tauri backend...");

  try {
    const startTime = Date.now();
    const result = await invoke<TauriLLMResult>("gemini_generate_text", { params });
    const elapsed = Date.now() - startTime;

    console.log("[llmService] Tauri backend response received in", elapsed, "ms");

    if (!result.success) {
      return { error: result.error || "请求失败" };
    }

    return { content: result.content };
  } catch (error) {
    console.error("[llmService] Tauri invoke error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

// ==================== Google (Gemini) 协议 ====================
async function fetchGeminiDirect(
  params: LLMGenerationParams,
  provider: Provider,
  onStream?: (chunk: string) => void
): Promise<LLMResponse> {
  try {
    const baseUrl = provider.baseUrl.replace(/\/+$/, "") + "/v1beta";

    // 构建 parts 数组
    type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
    const parts: Part[] = [];

    // 添加文本内容
    if (params.systemPrompt) {
      parts.push({ text: `系统指令：${params.systemPrompt}\n\n用户请求：${params.prompt}` });
    } else {
      parts.push({ text: params.prompt });
    }

    // 添加文件内容（base64）
    if (params.files && params.files.length > 0) {
      for (const file of params.files) {
        parts.push({
          inline_data: {
            mime_type: file.mimeType,
            data: file.data,
          },
        });
      }
    }

    // 构建请求体
    const contents: Array<{ role: string; parts: Part[] }> = [
      {
        role: "user",
        parts,
      },
    ];

    // 构建生成配置
    const generationConfig: Record<string, unknown> = {};
    if (params.temperature !== undefined) {
      generationConfig.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = params.maxTokens;
    }
    // 结构化输出配置
    if (params.responseJsonSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = params.responseJsonSchema;
    }

    // 如果有流式回调，使用流式 API
    if (onStream) {
      const url = `${baseUrl}/models/${params.model}:streamGenerateContent?alt=sse&key=${provider.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        return { error: errorMessage };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { error: "无法读取响应流" };
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullContent += text;
                onStream(fullContent);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { content: fullContent };
    }

    // 非流式请求
    const url = `${baseUrl}/models/${params.model}:generateContent?key=${provider.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      return { error: errorMessage };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { error: "无有效响应" };
    }

    let content = "";
    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text;
      }
    }

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    return { error: message };
  }
}

// ==================== OpenAI 协议 ====================
async function fetchOpenAIDirect(
  params: LLMGenerationParams,
  provider: Provider,
  onStream?: (chunk: string) => void
): Promise<LLMResponse> {
  try {
    const baseUrl = provider.baseUrl.replace(/\/+$/, "") + "/v1";

    // 构建消息数组
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    // 添加系统消息
    if (params.systemPrompt) {
      messages.push({
        role: "system",
        content: params.systemPrompt,
      });
    }

    // 构建用户消息内容
    if (params.files && params.files.length > 0) {
      // 多模态消息
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: params.prompt },
      ];
      for (const file of params.files) {
        if (file.mimeType.startsWith("image/")) {
          content.push({
            type: "image_url",
            image_url: { url: `data:${file.mimeType};base64,${file.data}` },
          });
        }
      }
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: params.prompt });
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model: params.model,
      messages,
      stream: !!onStream,
    };

    if (params.temperature !== undefined) {
      requestBody.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      requestBody.max_tokens = params.maxTokens;
    }
    // 结构化输出
    if (params.responseJsonSchema) {
      requestBody.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: params.responseJsonSchema,
        },
      };
    }

    const url = `${baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      return { error: errorMessage };
    }

    // 流式响应
    if (onStream) {
      const reader = response.body?.getReader();
      if (!reader) {
        return { error: "无法读取响应流" };
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onStream(fullContent);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { content: fullContent };
    }

    // 非流式响应
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "无有效响应" };
    }

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    return { error: message };
  }
}

// ==================== Claude 协议 ====================
async function fetchClaudeDirect(
  params: LLMGenerationParams,
  provider: Provider,
  onStream?: (chunk: string) => void
): Promise<LLMResponse> {
  try {
    const baseUrl = provider.baseUrl.replace(/\/+$/, "") + "/v1";

    // 构建消息数组
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> }> = [];

    // 构建用户消息内容
    if (params.files && params.files.length > 0) {
      // 多模态消息
      const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
      for (const file of params.files) {
        if (file.mimeType.startsWith("image/")) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: file.mimeType,
              data: file.data,
            },
          });
        }
      }
      content.push({ type: "text", text: params.prompt });
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: params.prompt });
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens || 4096,
      stream: !!onStream,
    };

    if (params.systemPrompt) {
      requestBody.system = params.systemPrompt;
    }
    if (params.temperature !== undefined) {
      requestBody.temperature = params.temperature;
    }

    const url = `${baseUrl}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      return { error: errorMessage };
    }

    // 流式响应
    if (onStream) {
      const reader = response.body?.getReader();
      if (!reader) {
        return { error: "无法读取响应流" };
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              // Claude 的流式格式
              if (data.type === "content_block_delta" && data.delta?.text) {
                fullContent += data.delta.text;
                onStream(fullContent);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { content: fullContent };
    }

    // 非流式响应
    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      return { error: "无有效响应" };
    }

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    return { error: message };
  }
}

// ==================== 统一调度函数 ====================
async function fetchLLMByProtocol(
  params: LLMGenerationParams,
  provider: Provider,
  onStream?: (chunk: string) => void
): Promise<LLMResponse> {
  const protocol = provider.protocol || "google";

  switch (protocol) {
    case "google":
      return fetchGeminiDirect(params, provider, onStream);
    case "openai":
      return fetchOpenAIDirect(params, provider, onStream);
    case "claude":
      return fetchClaudeDirect(params, provider, onStream);
    default:
      return fetchGeminiDirect(params, provider, onStream);
  }
}

// 文本生成（PPT 内容生成节点使用）
export async function generateText(params: LLMGenerationParams): Promise<LLMResponse> {
  try {
    const provider = getProviderConfig("llm");

    // Tauri 环境且为 Google 协议时使用后端代理
    if (isTauri() && provider.protocol === "google") {
      const baseUrl = provider.baseUrl.replace(/\/+$/, "") + "/v1beta";
      const requestParams: TauriLLMParams = {
        baseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        files: params.files,
        responseJsonSchema: params.responseJsonSchema,
      };
      return await invokeLLM(requestParams);
    }

    // 其他情况使用 Web 直接请求
    return await fetchLLMByProtocol(params, provider, params.onStream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return { error: message };
  }
}

// LLM 内容生成（LLM 内容生成节点使用）
export async function generateLLMContent(params: LLMGenerationParams): Promise<LLMResponse> {
  try {
    const provider = getProviderConfig("llmContent");

    // Tauri 环境且为 Google 协议时使用后端代理
    if (isTauri() && provider.protocol === "google") {
      const baseUrl = provider.baseUrl.replace(/\/+$/, "") + "/v1beta";
      const requestParams: TauriLLMParams = {
        baseUrl,
        apiKey: provider.apiKey,
        model: params.model,
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        files: params.files,
      };
      return await invokeLLM(requestParams);
    }

    // 其他情况使用 Web 直接请求
    return await fetchLLMByProtocol(params, provider, params.onStream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return { error: message };
  }
}

// 验证 JSON 输出
export function validateJsonOutput(content: string): { valid: boolean; data?: unknown; error?: string } {
  try {
    const data = JSON.parse(content);
    return { valid: true, data };
  } catch {
    return { valid: false, error: "输出不是有效的 JSON 格式" };
  }
}
