import { useMemo } from "react";
import { useFlowStore } from "@/stores/flowStore";
import {
  isFileInputEdge,
  isImageInputEdge,
  isPromptInputEdge,
} from "@/utils/connectionHandles";

/**
 * 节点连接状态 Hook
 * 用 selector 精确订阅与当前节点相关的上游数据，避免在渲染路径中遍历全图
 *
 * 返回：
 * - isPromptConnected: 是否有提示词连接（包括内容为空的情况）
 * - promptText: 连接的提示词文本（undefined 表示未连接）
 * - hasEmptyImageInputs: 是否有空的图片输入连接
 * - emptyImageLabels: 空图片输入的标签列表
 * - hasImageInputs: 是否有图片输入（非空）
 * - hasFileInputs: 是否有文件输入（非空）
 * - hasEmptyFileInputs: 是否有空的文件输入连接
 * - emptyFileLabels: 空文件输入的标签列表
 */
export function useNodeConnectionStatus(nodeId: string) {
  // 用 selector 只订阅 nodes 和 edges 的引用
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  return useMemo(() => {
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const prompts: string[] = [];
    let hasPromptConnection = false;
    const emptyImages: Array<{ id: string; label: string }> = [];
    const emptyFiles: Array<{ id: string; label: string }> = [];
    let imageCount = 0;
    let fileCount = 0;

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;
      const targetNode = nodes.find((n) => n.id === edge.target);

      // 检测提示词连接
      if (isPromptInputEdge(edge, sourceNode, targetNode)) {
        hasPromptConnection = true;
        if (sourceNode.type === "promptNode") {
          const data = sourceNode.data as { prompt?: string };
          if (data.prompt) prompts.push(data.prompt);
        } else if (sourceNode.type === "llmContentNode") {
          const data = sourceNode.data as { outputContent?: string };
          if (data.outputContent) prompts.push(data.outputContent);
        }
      }

      // 检测图片输入
      if (isImageInputEdge(edge, sourceNode, targetNode)) {
        if (sourceNode.type === "imageInputNode") {
          const data = sourceNode.data as { imageData?: string; imagePath?: string; label?: string };
          if (!data.imageData && !data.imagePath) {
            emptyImages.push({
              id: sourceNode.id,
              label: (data.label as string) || "图片输入",
            });
          } else {
            imageCount++;
          }
        } else if (sourceNode.type === "imageGeneratorNode") {
          const data = sourceNode.data as { outputImage?: string; outputImagePath?: string; label?: string };
          if (!data.outputImage && !data.outputImagePath) {
            emptyImages.push({
              id: sourceNode.id,
              label: (data.label as string) || "图片生成",
            });
          } else {
            imageCount++;
          }
        } else if (sourceNode.type === "videoGeneratorNode") {
          const data = sourceNode.data as { outputVideo?: string; videoData?: string; label?: string };
          if (!data.outputVideo && !data.videoData) {
            emptyImages.push({
              id: sourceNode.id,
              label: (data.label as string) || "视频生成",
            });
          } else {
            imageCount++;
          }
        }
      }

      // 检测文件输入
      if (isFileInputEdge(edge, sourceNode, targetNode)) {
        if (sourceNode.type === "fileUploadNode") {
          const data = sourceNode.data as { fileData?: string; label?: string };
          if (!data.fileData) {
            emptyFiles.push({
              id: sourceNode.id,
              label: (data.label as string) || "文件上传",
            });
          } else {
            fileCount++;
          }
        }
      }
    }

    const promptText = prompts.length > 0 ? prompts.join("\n\n") : undefined;

    return {
      isPromptConnected: hasPromptConnection,
      promptText,
      hasEmptyImageInputs: emptyImages.length > 0,
      emptyImageLabels: emptyImages.map((i) => i.label),
      hasImageInputs: imageCount > 0,
      hasFileInputs: fileCount > 0,
      hasEmptyFileInputs: emptyFiles.length > 0,
      emptyFileLabels: emptyFiles.map((f) => f.label),
    };
  }, [nodeId, nodes, edges]);
}
