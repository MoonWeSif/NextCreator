import { useCallback, useRef } from "react";
import { createVideoTask, getVideoContentBlobUrl, pollVideoTask } from "@/services/videoGeneration";
import type { VideoGenerationRequest } from "@/services/videoGeneration";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import {
  buildImageGeneratorPrompt,
  getPromptMentionSourcesForNode,
} from "@/utils/promptMentions";
import type {
  VideoGeneratorNodeData,
  VideoGeneratorRunRecord,
} from "@/components/nodes/videoGeneratorConfig";
import {
  buildVideoGenerationRequest,
  getVideoApiProtocol,
  getVideoApiProtocolConfig,
  getVideoModelDisplayName,
  parseVideoMetadata,
} from "@/components/nodes/videoGeneratorConfig";

const MAX_VIDEO_RUN_RECORDS = 8;

function createRunId() {
  return `video-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimRunRecords(records: VideoGeneratorRunRecord[] | undefined) {
  return (records || []).slice(0, MAX_VIDEO_RUN_RECORDS);
}

function redactVideoRequest(request: VideoGenerationRequest): VideoGenerationRequest {
  return {
    ...request,
    inputImage: request.inputImage
      ? `[image: ${Math.round(request.inputImage.length * 0.75).toLocaleString()} bytes]`
      : undefined,
  };
}

function getVideoRunOutputJson(params: {
  success?: boolean;
  taskId?: string;
  videoUrl?: string;
  hasVideoData?: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}) {
  return {
    success: Boolean(params.success),
    taskId: params.taskId,
    video: {
      url: params.videoUrl,
      hasInlineData: params.hasVideoData,
    },
    metadata: params.metadata,
    error: params.error,
  };
}

function getProviderNodeType(protocol: ReturnType<typeof getVideoApiProtocol>) {
  return protocol === "newapi-video-generations" ? "newApiVideoGenerator" : "videoGenerator";
}

export function useVideoGeneratorExecution(id: string, data: VideoGeneratorNodeData) {
  const {
    updateNodeData,
    nodes,
    edges,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfoAsync,
  } = useFlowStore();
  const canvasIdRef = useRef<string | null>(null);

  const apiProtocol = getVideoApiProtocol(data);
  const config = getVideoApiProtocolConfig(apiProtocol);
  const model = data.model || config.defaultModel;

  let validationError: string | undefined;
  try {
    parseVideoMetadata(data.metadataText);
  } catch (error) {
    validationError = error instanceof Error ? error.message : "扩展参数格式无效";
  }

  const updateNodeDataWithCanvas = useCallback(
    (nodeId: string, nodeData: Partial<VideoGeneratorNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      updateNodeData<VideoGeneratorNodeData>(nodeId, nodeData);

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
    const { prompt } = await getConnectedInputDataAsync(id);
    const mentionSources = getPromptMentionSourcesForNode(nodes, edges, id);
    const resolvedPrompt = buildImageGeneratorPrompt(data.prompt, prompt, mentionSources);
    const connectedImageDetails = await getConnectedImagesWithInfoAsync(id);
    const inputImages = connectedImageDetails.map((img) => img.imageData).filter(Boolean);
    const { activeCanvasId } = useCanvasStore.getState();
    canvasIdRef.current = activeCanvasId;

    if (!resolvedPrompt) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请填写节点提示词，或连接提示词节点",
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
    const providerNodeType = getProviderNodeType(apiProtocol);

    try {
      const request = buildVideoGenerationRequest(
        { ...data, apiProtocol, model },
        resolvedPrompt,
        inputImages
      );
      const safeRequest = redactVideoRequest(request);
      const imageLabels = connectedImageDetails.map((image, index) => image.fileName || `参考图 ${index + 1}`);
      const runInput = {
        prompt: resolvedPrompt,
        imageCount: inputImages.length,
        imageLabels,
        request: safeRequest,
      };

      updateNodeDataWithCanvas(id, {
        status: "loading",
        error: undefined,
        errorDetails: undefined,
        taskId: undefined,
        taskStage: "queued",
        progress: 0,
        outputVideo: undefined,
        videoData: undefined,
        runRecords: trimRunRecords([
          {
            id: runId,
            startedAt,
            status: "loading",
            protocol: apiProtocol,
            protocolLabel: config.label,
            model,
            modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
            input: runInput,
          },
          ...(data.runRecords || []),
        ]),
      });

      const createResult = await createVideoTask(request, providerNodeType);

      if (createResult.error || !createResult.taskId) {
        const finishedAt = Date.now();
        const error = createResult.error || "创建任务失败";
        updateNodeDataWithCanvas(id, {
          status: "error",
          error,
          errorDetails: createResult.errorDetails,
          taskStage: "failed",
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
              modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
              input: runInput,
              output: {
                metadata: getVideoRunOutputJson({ success: false, error }),
              },
              error,
              errorDetails: createResult.errorDetails,
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
        return;
      }

      const taskId = createResult.taskId;
      updateNodeDataWithCanvas(id, {
        taskId,
        taskStage: createResult.status || "queued",
        progress: createResult.progress || 0,
      });

      const pollResult = await pollVideoTask(
        taskId,
        (info) => {
          updateNodeDataWithCanvas(id, {
            progress: info.progress,
            taskStage: info.stage,
            taskId: info.taskId,
            status: info.stage === "failed" ? "error" : "loading",
          });
        },
        120,
        5000,
        undefined,
        providerNodeType
      );

      if (pollResult.error) {
        const finishedAt = Date.now();
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: pollResult.error,
          errorDetails: pollResult.errorDetails,
          taskStage: "failed",
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
              modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
              input: runInput,
              output: {
                taskId,
                metadata: getVideoRunOutputJson({ success: false, taskId, error: pollResult.error }),
              },
              error: pollResult.error,
              errorDetails: pollResult.errorDetails,
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
        return;
      }

      let outputVideo = pollResult.videoUrl;
      let videoData = pollResult.videoData;
      if (!outputVideo && !videoData) {
        const contentResult = await getVideoContentBlobUrl(taskId, providerNodeType);
        if (contentResult.url) {
          outputVideo = contentResult.url;
        }
      }

      if (!outputVideo && !videoData) {
        const finishedAt = Date.now();
        const error = "视频任务已完成，但没有获取到可预览的视频内容";
        updateNodeDataWithCanvas(id, {
          status: "error",
          error,
          errorDetails: undefined,
          taskStage: "failed",
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
              modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
              input: runInput,
              output: {
                taskId,
                metadata: getVideoRunOutputJson({ success: false, taskId, error }),
              },
              error,
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
        return;
      }

      const finishedAt = Date.now();
      const outputMetadata = getVideoRunOutputJson({
        success: true,
        taskId,
        videoUrl: outputVideo,
        hasVideoData: Boolean(videoData),
        metadata: pollResult.metadata,
      });

      updateNodeDataWithCanvas(id, {
        status: "success",
        taskStage: "completed",
        progress: 100,
        taskId,
        outputVideo,
        videoData,
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
            modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
            input: runInput,
            output: {
              taskId,
              videoUrl: outputVideo,
              videoData,
              metadata: outputMetadata,
              statusSnapshot: pollResult.statusSnapshot,
            },
          },
          ...(data.runRecords || []).filter((record) => record.id !== runId),
        ]),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      const finishedAt = Date.now();
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: message,
        errorDetails: undefined,
        taskStage: "failed",
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
            modelLabel: getVideoModelDisplayName({ ...data, apiProtocol, model }),
            input: {
              prompt: resolvedPrompt,
              imageCount: inputImages.length,
              request: {
                apiProtocol,
                prompt: resolvedPrompt,
                model,
              },
            },
            output: {
              metadata: getVideoRunOutputJson({ success: false, error: message }),
            },
            error: message,
          },
          ...(data.runRecords || []).filter((record) => record.id !== runId),
        ]),
      });
    }
  }, [
    id,
    data,
    nodes,
    edges,
    apiProtocol,
    model,
    config,
    validationError,
    updateNodeDataWithCanvas,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfoAsync,
  ]);

  return {
    handleGenerate,
    model,
    validationError,
  };
}
