import type { Edge, Node } from "@xyflow/react";

export const IMAGE_GENERATOR_UNIFIED_INPUT_HANDLE = "input";
export const VIDEO_GENERATOR_UNIFIED_INPUT_HANDLE = "input";
export const LLM_CONTENT_UNIFIED_INPUT_HANDLE = "input";

export function isImageGeneratorUnifiedInput(
  targetNodeType: string | undefined,
  targetHandle?: string | null
) {
  return targetNodeType === "imageGeneratorNode" && targetHandle === IMAGE_GENERATOR_UNIFIED_INPUT_HANDLE;
}

export function isVideoGeneratorUnifiedInput(
  targetNodeType: string | undefined,
  targetHandle?: string | null
) {
  return targetNodeType === "videoGeneratorNode" && targetHandle === VIDEO_GENERATOR_UNIFIED_INPUT_HANDLE;
}

export function isLLMContentUnifiedInput(
  targetNodeType: string | undefined,
  targetHandle?: string | null
) {
  return targetNodeType === "llmContentNode" && targetHandle === LLM_CONTENT_UNIFIED_INPUT_HANDLE;
}

export function isPromptLikeSourceType(sourceNodeType: string | undefined) {
  return sourceNodeType === "promptNode" || sourceNodeType === "llmContentNode";
}

export function isImageLikeSourceType(sourceNodeType: string | undefined) {
  return sourceNodeType === "imageInputNode" || sourceNodeType === "imageGeneratorNode";
}

export function isFileLikeSourceType(sourceNodeType: string | undefined) {
  return sourceNodeType === "fileUploadNode";
}

export function isPromptInputEdge(
  edge: Edge,
  sourceNode: Node,
  targetNode?: Node
) {
  return (
    edge.targetHandle === "input-prompt" ||
    (
      isImageGeneratorUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isPromptLikeSourceType(sourceNode.type)
    ) ||
    (
      isVideoGeneratorUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isPromptLikeSourceType(sourceNode.type)
    ) ||
    (
      isLLMContentUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isPromptLikeSourceType(sourceNode.type)
    ) ||
    (!edge.targetHandle && isPromptLikeSourceType(sourceNode.type))
  );
}

export function isImageInputEdge(
  edge: Edge,
  sourceNode: Node,
  targetNode?: Node
) {
  return (
    edge.targetHandle === "input-image" ||
    (
      isImageGeneratorUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isImageLikeSourceType(sourceNode.type)
    ) ||
    (
      isVideoGeneratorUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isImageLikeSourceType(sourceNode.type)
    ) ||
    (
      isLLMContentUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isImageLikeSourceType(sourceNode.type)
    ) ||
    (!edge.targetHandle && isImageLikeSourceType(sourceNode.type))
  );
}

export function isFileInputEdge(
  edge: Edge,
  sourceNode: Node,
  targetNode?: Node
) {
  return (
    edge.targetHandle === "input-file" ||
    (
      isLLMContentUnifiedInput(targetNode?.type, edge.targetHandle) &&
      isFileLikeSourceType(sourceNode.type)
    ) ||
    (!edge.targetHandle && isFileLikeSourceType(sourceNode.type))
  );
}
