import { useCallback, useRef } from "react";
import { generateLLMContent } from "@/services/llmService";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import {
  buildImageGeneratorPrompt,
  getPromptMentionSourcesForNode,
} from "@/utils/promptMentions";
import type {
  LLMContentNodeData,
  LLMContentRunRecord,
} from "@/components/nodes/llmContentConfig";
import {
  buildLLMGenerationParams,
  getLLMApiProtocol,
  getLLMApiProtocolConfig,
  getLLMModelDisplayName,
  parseLLMJsonSchema,
} from "@/components/nodes/llmContentConfig";

const MAX_LLM_RUN_RECORDS = 8;

function createRunId() {
  return `llm-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimRunRecords(records: LLMContentRunRecord[] | undefined) {
  return (records || []).slice(0, MAX_LLM_RUN_RECORDS);
}

function stripDataUrlPrefix(data: string) {
  const match = data.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: undefined, data };
  return { mimeType: match[1], data: match[2] };
}

function guessImageMimeType(data: string) {
  const parsed = stripDataUrlPrefix(data);
  if (parsed.mimeType) return parsed.mimeType;
  if (data.startsWith("/9j/")) return "image/jpeg";
  if (data.startsWith("iVBORw0KGgo")) return "image/png";
  if (data.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function imageToFile(imageData: string, index: number) {
  const parsed = stripDataUrlPrefix(imageData);
  const mimeType = parsed.mimeType || guessImageMimeType(imageData);
  const extension = mimeType.split("/")[1] || "png";
  return {
    data: parsed.data,
    mimeType,
    fileName: `image-${index + 1}.${extension}`,
  };
}

function redactLLMFiles(files?: Array<{ data: string; mimeType: string; fileName?: string }>) {
  return files?.map((file) => ({
    mimeType: file.mimeType,
    fileName: file.fileName,
    size: `${Math.round(file.data.length * 0.75).toLocaleString()} bytes`,
  }));
}

function getLLMRunOutputJson(params: {
  success?: boolean;
  content?: string;
  error?: string;
}) {
  return {
    success: Boolean(params.success),
    contentLength: params.content?.length || 0,
    error: params.error,
  };
}

export function useLLMContentExecution(id: string, data: LLMContentNodeData) {
  const {
    updateNodeData,
    nodes,
    edges,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfoAsync,
    getConnectedFilesWithInfo,
  } = useFlowStore();
  const canvasIdRef = useRef<string | null>(null);

  const apiProtocol = getLLMApiProtocol(data);
  const config = getLLMApiProtocolConfig(apiProtocol);
  const model = data.model || config.defaultModel;

  let validationError: string | undefined;
  try {
    if (data.responseFormat === "json_schema") {
      parseLLMJsonSchema(data.responseJsonSchemaText);
    }
  } catch (error) {
    validationError = error instanceof Error ? error.message : "JSON Schema 格式无效";
  }

  const updateNodeDataWithCanvas = useCallback(
    (nodeId: string, nodeData: Partial<LLMContentNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      updateNodeData<LLMContentNodeData>(nodeId, nodeData);

      if (targetCanvasId && targetCanvasId !== activeCanvasId) {
        const canvasStore = useCanvasStore.getState();
        const canvas = canvasStore.canvases.find((c) => c.id === targetCanvasId);

        if (canvas) {
          const updatedNodes = canvas.nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, ...nodeData } };
            }
            return node;
          });

          useCanvasStore.setState((state) => ({
            canvases: state.canvases.map((c) =>
              c.id === targetCanvasId ? { ...c, nodes: updatedNodes, updatedAt: Date.now() } : c
            ),
          }));
        }
      }
    },
    [updateNodeData]
  );

  const handleGenerate = useCallback(async () => {
    const { prompt, files, images } = await getConnectedInputDataAsync(id);
    const mentionSources = getPromptMentionSourcesForNode(nodes, edges, id);
    const resolvedPrompt = buildImageGeneratorPrompt(data.prompt, prompt, mentionSources);
    const connectedImageDetails = await getConnectedImagesWithInfoAsync(id);
    const connectedFileDetails = getConnectedFilesWithInfo(id);
    const { activeCanvasId } = useCanvasStore.getState();
    canvasIdRef.current = activeCanvasId;

    const imageFiles = images.map(imageToFile);
    const allFiles = [...files, ...imageFiles];
    const hasFiles = allFiles.length > 0;

    if (!resolvedPrompt && !hasFiles) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请填写节点提示词，或连接提示词、图片、文件节点",
        errorDetails: undefined,
      });
      return;
    }

    if (validationError) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: validationError,
        errorDetails: undefined,
      });
      return;
    }

    const startedAt = Date.now();
    const runId = createRunId();
    const promptForRequest = resolvedPrompt || "请分析输入内容";

    try {
      const request = buildLLMGenerationParams(
        { ...data, apiProtocol, model },
        promptForRequest,
        allFiles
      );
      const safeRequest = {
        ...request,
        files: redactLLMFiles(request.files),
      };
      const imageLabels = connectedImageDetails.map((image, index) => image.fileName || `图片 ${index + 1}`);
      const fileLabels = connectedFileDetails.map((file, index) => file.fileName || `文件 ${index + 1}`);
      const runInput: LLMContentRunRecord["input"] = {
        prompt: promptForRequest,
        systemPrompt: data.systemPrompt?.trim() || undefined,
        imageCount: imageFiles.length,
        fileCount: files.length,
        imageLabels,
        fileLabels,
        request: safeRequest,
      };

      updateNodeDataWithCanvas(id, {
        status: "loading",
        error: undefined,
        errorDetails: undefined,
        outputContent: "",
        runRecords: trimRunRecords([
          {
            id: runId,
            startedAt,
            status: "loading",
            protocol: apiProtocol,
            protocolLabel: config.label,
            model,
            modelLabel: getLLMModelDisplayName({ ...data, apiProtocol, model }),
            input: runInput,
          },
          ...(data.runRecords || []),
        ]),
      });

      const response = await generateLLMContent(request);
      const finishedAt = Date.now();

      if (response.error || response.content == null) {
        const error = response.error || "API 未返回有效内容";
        updateNodeDataWithCanvas(id, {
          status: "error",
          error,
          errorDetails: response.errorDetails,
          runRecords: trimRunRecords([
            {
              id: runId,
              startedAt,
              finishedAt,
              durationMs: finishedAt - startedAt,
              status: "error",
              protocol: apiProtocol,
              protocolLabel: config.label,
              model,
              modelLabel: getLLMModelDisplayName({ ...data, apiProtocol, model }),
              input: runInput,
              output: {
                metadata: getLLMRunOutputJson({ success: false, error }),
              },
              error,
              errorDetails: response.errorDetails,
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
        return;
      }

      updateNodeDataWithCanvas(id, {
        status: "success",
        outputContent: response.content,
        error: undefined,
        errorDetails: undefined,
        runRecords: trimRunRecords([
          {
            id: runId,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            status: "success",
            protocol: apiProtocol,
            protocolLabel: config.label,
            model,
            modelLabel: getLLMModelDisplayName({ ...data, apiProtocol, model }),
            input: runInput,
            output: {
              content: response.content,
              metadata: getLLMRunOutputJson({ success: true, content: response.content }),
            },
          },
          ...(data.runRecords || []).filter((record) => record.id !== runId),
        ]),
      });
    } catch (error) {
      const finishedAt = Date.now();
      const errorMessage = error instanceof Error ? error.message : "生成失败";

      updateNodeDataWithCanvas(id, {
        status: "error",
        error: errorMessage,
        errorDetails: undefined,
        runRecords: trimRunRecords([
          {
            id: runId,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            status: "error",
            protocol: apiProtocol,
            protocolLabel: config.label,
            model,
            modelLabel: getLLMModelDisplayName({ ...data, apiProtocol, model }),
            input: {
              prompt: promptForRequest,
              systemPrompt: data.systemPrompt?.trim() || undefined,
              imageCount: imageFiles.length,
              fileCount: files.length,
              request: {
                apiProtocol,
                prompt: promptForRequest,
                model,
                systemPrompt: data.systemPrompt?.trim() || undefined,
                temperature: data.temperature,
                maxTokens: data.maxTokens,
                files: redactLLMFiles(allFiles),
              },
            },
            output: {
              metadata: getLLMRunOutputJson({ success: false, error: errorMessage }),
            },
            error: errorMessage,
          },
          ...(data.runRecords || []).filter((record) => record.id !== runId),
        ]),
      });
    }
  }, [
    apiProtocol,
    config.label,
    data,
    edges,
    getConnectedFilesWithInfo,
    getConnectedImagesWithInfoAsync,
    getConnectedInputDataAsync,
    id,
    model,
    nodes,
    updateNodeDataWithCanvas,
    validationError,
  ]);

  return {
    handleGenerate,
    model,
    validationError,
  };
}

