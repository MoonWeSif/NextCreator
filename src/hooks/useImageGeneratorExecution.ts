import { useCallback, useRef } from "react";
import { editImage, generateImage } from "@/services/imageGeneration";
import type { ImageGenerationRequest } from "@/services/imageGeneration";
import { saveImage, type InputImageInfo } from "@/services/fileStorageService";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import type { ImageInputNodeData } from "@/types";
import {
  buildImageGeneratorPrompt,
  getPromptMentionSourcesForNode,
} from "@/utils/promptMentions";
import type { ImageGeneratorNodeData } from "@/components/nodes/imageGeneratorConfig";
import {
  buildImageGenerationRequest,
  getImageApiProtocol,
  getImageApiProtocolConfig,
  getImageModelDisplayName,
  getResolvedOpenAIImageSize,
  validateGptImage2Size,
} from "@/components/nodes/imageGeneratorConfig";
import { compositeWithMask } from "@/utils/imageMask";

const MAX_IMAGE_RUN_RECORDS = 8;

function createRunId() {
  return `image-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimRunRecords(records: ImageGeneratorNodeData["runRecords"]) {
  return (records || []).slice(0, MAX_IMAGE_RUN_RECORDS);
}

function redactLargeImagePayloads(request: ImageGenerationRequest): ImageGenerationRequest {
  return {
    ...request,
    inputImages: request.inputImages?.map((image, index) =>
      `[image ${index + 1}: ${Math.round(image.length * 0.75).toLocaleString()} bytes]`
    ),
    maskImage: request.maskImage
      ? `[mask: ${Math.round(request.maskImage.length * 0.75).toLocaleString()} bytes]`
      : undefined,
  };
}

function getImageRunOutputJson(params: {
  success?: boolean;
  text?: string;
  metadata?: Record<string, unknown>;
  imagePaths?: string[];
  imageDataList?: string[];
  error?: string;
}) {
  return {
    success: Boolean(params.success),
    text: params.text,
    metadata: params.metadata,
    images: {
      count: (params.imagePaths?.length || params.imageDataList?.length || 0),
      paths: params.imagePaths,
      inlineDataCount: params.imageDataList?.length,
    },
    error: params.error,
  };
}

export function useImageGeneratorExecution(id: string, data: ImageGeneratorNodeData) {
  const {
    updateNodeData,
    nodes,
    edges,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfo,
    getConnectedImagesWithInfoAsync,
  } = useFlowStore();
  const canvasIdRef = useRef<string | null>(null);

  const apiProtocol = getImageApiProtocol(data);
  const config = getImageApiProtocolConfig(apiProtocol);
  const model = data.model || config.defaultModel;
  const resolvedSize = getResolvedOpenAIImageSize({ ...data, model });
  const sizeValidationError = config.hasOpenAIImageControls && model === "gpt-image-2"
    ? validateGptImage2Size(resolvedSize)
    : undefined;

  const updateNodeDataWithCanvas = useCallback(
    (nodeId: string, nodeData: Partial<ImageGeneratorNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      updateNodeData<ImageGeneratorNodeData>(nodeId, nodeData);

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
    const orderedImageDetails = [...connectedImageDetails].sort((a, b) => {
      return Number(!!b.hasMask && !!b.maskImageData) - Number(!!a.hasMask && !!a.maskImageData);
    });
    const inputImages = config.supportsImageInput
      ? orderedImageDetails.map((img) => img.imageData).filter(Boolean)
      : [];
    const maskImage = config.hasOpenAIImageControls
      ? orderedImageDetails.find((img) => img.hasMask && img.maskImageData)?.maskImageData
      : undefined;
    const { activeCanvasId } = useCanvasStore.getState();
    canvasIdRef.current = activeCanvasId;

    if (!resolvedPrompt) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    if (sizeValidationError) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: sizeValidationError,
        errorDetails: undefined,
      });
      return;
    }

    const startedAt = Date.now();
    const runId = createRunId();
    const operation = inputImages.length > 0 || maskImage ? "edit" : "generate";

    try {
      let finalPrompt = resolvedPrompt;
      if (!config.hasOpenAIImageControls && inputImages.length > 0) {
        const hasMaskInput = connectedImageDetails.some((img) => img.hasMask);
        if (hasMaskInput) {
          finalPrompt = `I'm providing two images: the original image and the same image with red highlighted areas marking the regions I want you to edit. Please edit ONLY the red-marked areas according to this instruction: ${resolvedPrompt}`;
        }

        for (const img of orderedImageDetails) {
          if (!img.hasMask || !img.maskImageData || !img.imageData) continue;
          try {
            inputImages.push(await compositeWithMask(img.imageData, img.maskImageData));
          } catch {
            inputImages.push(img.maskImageData);
          }
        }
      }

      const request = buildImageGenerationRequest(
        { ...data, apiProtocol, model },
        finalPrompt,
        inputImages.length > 0 ? inputImages : undefined,
        maskImage
      );

      const safeRequest = redactLargeImagePayloads(request);
      const runInput = {
        prompt: finalPrompt,
        imageCount: inputImages.length,
        imageLabels: orderedImageDetails.map((image, index) => image.fileName || `参考图 ${index + 1}`),
        request: safeRequest,
      };

      updateNodeDataWithCanvas(id, {
        status: "loading",
        error: undefined,
        runRecords: trimRunRecords([
          {
            id: runId,
            startedAt,
            status: "loading",
            protocol: apiProtocol,
            protocolLabel: config.label,
            model,
            modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
            operation,
            input: runInput,
          },
          ...(data.runRecords || []),
        ]),
      });

      const response = operation === "edit"
        ? await editImage(request, config.providerKey)
        : await generateImage(request, config.providerKey);

      if (response.imageData) {
        if (activeCanvasId) {
          try {
            const connectedImages = getConnectedImagesWithInfo(id);
            const inputImagesMetadata: InputImageInfo[] = [];

            for (const img of connectedImages) {
              let imagePath = img.imagePath;
              if (!imagePath && img.imageData) {
                try {
                  const inputImageInfo = await saveImage(
                    img.imageData,
                    activeCanvasId,
                    img.id,
                    undefined,
                    undefined,
                    "input"
                  );
                  imagePath = inputImageInfo.path;
                  updateNodeData<ImageInputNodeData>(img.id, { imagePath: inputImageInfo.path });
                } catch (err) {
                  console.warn("保存输入图片失败:", err);
                }
              }

              if (imagePath) {
                inputImagesMetadata.push({ path: imagePath, label: img.fileName || "输入图片" });
              }
            }

            const imagesToSave = response.imageDataList?.length
              ? response.imageDataList
              : [response.imageData];
            const savedImages = await Promise.all(
              imagesToSave.map((imageData) =>
                saveImage(
                  imageData,
                  activeCanvasId,
                  id,
                  resolvedPrompt,
                  inputImagesMetadata.length > 0 ? inputImagesMetadata : undefined,
                  "generated"
                )
              )
            );
            const outputImagePaths = savedImages.map((image) => image.path);
            const finishedAt = Date.now();
            const outputJson = getImageRunOutputJson({
              success: true,
              text: response.text,
              metadata: response.metadata,
              imagePaths: outputImagePaths,
            });

            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: undefined,
              outputImagePath: savedImages[0]?.path,
              outputImages: undefined,
              outputImagePaths,
              error: undefined,
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
                  modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
                  operation,
                  input: runInput,
                  output: {
                    text: response.text,
                    metadata: outputJson,
                    imagePaths: outputImagePaths,
                  },
                },
                ...(data.runRecords || []).filter((record) => record.id !== runId),
              ]),
            });
          } catch (saveError) {
            console.warn("文件保存失败，回退到 base64 存储:", saveError);
            const imageDataList = response.imageDataList?.length
              ? response.imageDataList
              : [response.imageData];
            const finishedAt = Date.now();
            const outputJson = getImageRunOutputJson({
              success: true,
              text: response.text,
              metadata: response.metadata,
              imageDataList,
            });
            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: response.imageData,
              outputImagePath: undefined,
              outputImages: imageDataList,
              outputImagePaths: undefined,
              error: undefined,
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
                  modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
                  operation,
                  input: runInput,
                  output: {
                    text: response.text,
                    metadata: outputJson,
                    imageDataList,
                  },
                },
                ...(data.runRecords || []).filter((record) => record.id !== runId),
              ]),
            });
          }
        } else {
          const imageDataList = response.imageDataList?.length
            ? response.imageDataList
            : [response.imageData];
          const finishedAt = Date.now();
          const outputJson = getImageRunOutputJson({
            success: true,
            text: response.text,
            metadata: response.metadata,
            imageDataList,
          });
          updateNodeDataWithCanvas(id, {
            status: "success",
            outputImage: response.imageData,
            outputImagePath: undefined,
            outputImages: imageDataList,
            outputImagePaths: undefined,
            error: undefined,
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
                modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
                operation,
                input: runInput,
                output: {
                  text: response.text,
                  metadata: outputJson,
                  imageDataList,
                },
              },
              ...(data.runRecords || []).filter((record) => record.id !== runId),
            ]),
          });
        }
      } else if (response.error) {
        const finishedAt = Date.now();
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: response.error,
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
              modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
              operation,
              input: runInput,
              output: {
                metadata: getImageRunOutputJson({ success: false, error: response.error }),
              },
              error: response.error,
              errorDetails: response.errorDetails,
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
      } else {
        const finishedAt = Date.now();
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: "未返回图片数据",
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
              modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
              operation,
              input: runInput,
              output: {
                metadata: getImageRunOutputJson({ success: false, error: "未返回图片数据" }),
              },
              error: "未返回图片数据",
            },
            ...(data.runRecords || []).filter((record) => record.id !== runId),
          ]),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      const finishedAt = Date.now();
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: message,
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
            modelLabel: getImageModelDisplayName({ ...data, apiProtocol, model }),
            operation,
            input: {
              prompt: resolvedPrompt,
              imageCount: inputImages.length,
              imageLabels: orderedImageDetails.map((image, index) => image.fileName || `参考图 ${index + 1}`),
              request: {
                prompt: resolvedPrompt,
                model,
                apiProtocol,
              },
            },
            output: {
              metadata: getImageRunOutputJson({ success: false, error: message }),
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
    sizeValidationError,
    updateNodeDataWithCanvas,
    getConnectedInputDataAsync,
    getConnectedImagesWithInfo,
    getConnectedImagesWithInfoAsync,
    updateNodeData,
  ]);

  return {
    handleGenerate,
    model,
    resolvedSize,
    sizeValidationError,
  };
}
