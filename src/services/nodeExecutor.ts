/**
 * 节点执行适配器
 * 为每种节点类型提供统一的执行接口
 */

import type { Node, Edge } from "@xyflow/react";
import type {
  CustomNodeData,
  ImageGeneratorNodeData,
  LLMContentNodeData,
  VideoGeneratorNodeData,
  PPTContentNodeData,
} from "@/types";
import type { NodeExecutionResult } from "@/types/workflow";
import { shouldSkipNode } from "@/types/workflow";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { generateImage, editImage } from "@/services/imageService";
import { generateLLMContent } from "@/services/llmService";
import { createVideoTask, pollVideoTask } from "@/services/videoService";
import { saveImage, readImage } from "@/services/fileStorageService";

// 自定义节点类型
type CustomNode = Node<CustomNodeData>;

/**
 * 从指定画布获取连接的输入数据（异步版本，支持从文件加载图片）
 * 解决画布切换时数据读取错误的问题
 */
async function getConnectedInputDataFromCanvas(
  nodeId: string,
  canvasId: string
): Promise<{
  prompt?: string;
  images: string[];
  files: Array<{ data: string; mimeType: string; fileName?: string }>;
}> {
  const { activeCanvasId } = useCanvasStore.getState();

  // 如果是当前活跃画布，使用 flowStore 的异步版本
  if (canvasId === activeCanvasId) {
    return useFlowStore.getState().getConnectedInputDataAsync(nodeId);
  }

  // 否则从 canvasStore 读取目标画布的数据
  const canvas = useCanvasStore.getState().canvases.find((c) => c.id === canvasId);
  if (!canvas) {
    return { images: [], files: [] };
  }

  const nodes = canvas.nodes as CustomNode[];
  const edges = canvas.edges as Edge[];
  const incomingEdges = edges.filter((edge) => edge.target === nodeId);

  // 支持多个 prompt 输入，收集后拼接
  const prompts: string[] = [];
  const images: string[] = [];
  const files: Array<{ data: string; mimeType: string; fileName?: string }> = [];

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;

    const targetHandle = edge.targetHandle;

    if (targetHandle === "input-prompt") {
      // 从 prompt 输入端口连接的数据（支持多个，会自动拼接）
      if (sourceNode.type === "promptNode") {
        const data = sourceNode.data as { prompt?: string };
        if (data.prompt) prompts.push(data.prompt);
      } else if (sourceNode.type === "llmContentNode") {
        const data = sourceNode.data as { outputContent?: string };
        if (data.outputContent) prompts.push(data.outputContent);
      }
    } else if (targetHandle === "input-image") {
      let imageData: string | undefined;
      if (sourceNode.type === "imageInputNode") {
        const data = sourceNode.data as { imageData?: string; imagePath?: string };
        // 优先从文件加载
        if (data.imagePath) {
          try {
            imageData = await readImage(data.imagePath);
          } catch (err) {
            console.warn("从文件加载图片失败:", err);
            imageData = data.imageData;
          }
        } else {
          imageData = data.imageData;
        }
      } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
        const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
        // 优先从文件加载
        if (data.outputImagePath) {
          try {
            imageData = await readImage(data.outputImagePath);
          } catch (err) {
            console.warn("从文件加载图片失败:", err);
            imageData = data.outputImage;
          }
        } else {
          imageData = data.outputImage;
        }
      }
      if (imageData) {
        images.push(imageData);
      }
    } else if (targetHandle === "input-file") {
      if (sourceNode.type === "fileUploadNode") {
        const data = sourceNode.data as { fileData?: string; mimeType?: string; fileName?: string };
        if (data.fileData && data.mimeType) {
          files.push({
            data: data.fileData,
            mimeType: data.mimeType,
            fileName: data.fileName,
          });
        }
      }
    } else {
      // 兼容旧连接
      if (sourceNode.type === "promptNode") {
        const data = sourceNode.data as { prompt?: string };
        if (data.prompt) prompts.push(data.prompt);
      } else if (sourceNode.type === "llmContentNode") {
        const data = sourceNode.data as { outputContent?: string };
        if (data.outputContent) prompts.push(data.outputContent);
      } else if (sourceNode.type === "imageInputNode") {
        const data = sourceNode.data as { imageData?: string; imagePath?: string };
        let imageData: string | undefined;
        if (data.imagePath) {
          try {
            imageData = await readImage(data.imagePath);
          } catch (err) {
            console.warn("从文件加载图片失败:", err);
            imageData = data.imageData;
          }
        } else {
          imageData = data.imageData;
        }
        if (imageData) images.push(imageData);
      } else if (sourceNode.type === "imageGeneratorProNode" || sourceNode.type === "imageGeneratorFastNode") {
        const data = sourceNode.data as { outputImage?: string; outputImagePath?: string };
        let imageData: string | undefined;
        if (data.outputImagePath) {
          try {
            imageData = await readImage(data.outputImagePath);
          } catch (err) {
            console.warn("从文件加载图片失败:", err);
            imageData = data.outputImage;
          }
        } else {
          imageData = data.outputImage;
        }
        if (imageData) images.push(imageData);
      } else if (sourceNode.type === "fileUploadNode") {
        const data = sourceNode.data as { fileData?: string; mimeType?: string; fileName?: string };
        if (data.fileData && data.mimeType) {
          files.push({ data: data.fileData, mimeType: data.mimeType, fileName: data.fileName });
        }
      }
    }
  }

  // 将多个 prompt 拼接成一个字符串，用换行符分隔
  const prompt = prompts.length > 0 ? prompts.join("\n\n") : undefined;
  return { prompt, images, files };
}

/**
 * 画布感知的节点数据更新
 * 确保即使用户切换画布，状态也能正确更新到目标画布
 */
function updateNodeDataWithCanvas<T extends CustomNodeData>(
  nodeId: string,
  canvasId: string,
  data: Partial<T>
): void {
  const { activeCanvasId } = useCanvasStore.getState();

  if (canvasId === activeCanvasId) {
    // 目标画布是当前活跃画布，直接更新 flowStore
    const { updateNodeData } = useFlowStore.getState();
    updateNodeData<T>(nodeId, data);
  } else {
    // 目标画布不是当前活跃画布，只更新 canvasStore
    // 不要更新 flowStore，因为 flowStore 现在加载的是其他画布的数据
    const canvasStore = useCanvasStore.getState();
    const canvas = canvasStore.canvases.find((c) => c.id === canvasId);

    if (canvas) {
      const updatedNodes = canvas.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      });

      useCanvasStore.setState((state) => ({
        canvases: state.canvases.map((c) =>
          c.id === canvasId ? { ...c, nodes: updatedNodes, updatedAt: Date.now() } : c
        ),
      }));
    }
  }
}

/**
 * 执行图片生成节点
 */
async function executeImageGeneratorNode(
  node: CustomNode,
  canvasId: string,
  signal?: AbortSignal
): Promise<NodeExecutionResult> {
  const data = node.data as ImageGeneratorNodeData;
  const isPro = node.type === "imageGeneratorProNode";
  const nodeType = isPro ? "imageGeneratorPro" : "imageGeneratorFast";
  // 使用画布感知的数据读取，解决画布切换问题（异步从文件加载图片）
  const { prompt, images } = await getConnectedInputDataFromCanvas(node.id, canvasId);

  // 验证输入
  if (!prompt) {
    updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
      status: "error",
      error: "缺少必需的提示词输入",
    });
    return { success: false, error: "缺少必需的提示词输入" };
  }

  // 更新状态为加载中
  updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
    status: "loading",
    error: undefined,
  });

  try {
    // 调用服务
    const response =
      images.length > 0
        ? await editImage(
            {
              prompt,
              model: data.model,
              inputImages: images,
              aspectRatio: data.aspectRatio,
              imageSize: isPro ? data.imageSize : undefined,
            },
            nodeType,
            signal
          )
        : await generateImage(
            {
              prompt,
              model: data.model,
              aspectRatio: data.aspectRatio,
              imageSize: isPro ? data.imageSize : undefined,
            },
            nodeType,
            signal
          );

    // 检查是否被取消
    if (signal?.aborted) {
      updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
        status: "idle",
      });
      return { success: false, error: "已取消" };
    }

    if (response.error) {
      updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
        status: "error",
        error: response.error,
        errorDetails: response.errorDetails,
      });
      return { success: false, error: response.error };
    }

    // 保存图片
    let imagePath: string | undefined;
    if (response.imageData) {
      try {
        const imageInfo = await saveImage(response.imageData, canvasId, node.id);
        imagePath = imageInfo.path;
      } catch {
        // 文件保存失败，回退到 base64
      }
    }

    // 更新成功状态
    updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
      status: "success",
      outputImage: response.imageData,
      outputImagePath: imagePath,
      error: undefined,
    });

    return {
      success: true,
      output: { imageData: response.imageData, imagePath },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "执行失败";

    // 检查是否是中断错误
    if (error instanceof Error && error.name === "AbortError") {
      updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
        status: "idle",
      });
      return { success: false, error: "已取消" };
    }

    updateNodeDataWithCanvas<ImageGeneratorNodeData>(node.id, canvasId, {
      status: "error",
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 执行 LLM 内容生成节点
 */
async function executeLLMContentNode(
  node: CustomNode,
  canvasId: string,
  signal?: AbortSignal
): Promise<NodeExecutionResult> {
  const data = node.data as LLMContentNodeData;
  // 使用画布感知的数据读取，解决画布切换问题（异步从文件加载图片）
  const { prompt, files } = await getConnectedInputDataFromCanvas(node.id, canvasId);

  // 验证输入
  if (!prompt && files.length === 0) {
    updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
      status: "error",
      error: "缺少必需的提示词或文件输入",
    });
    return { success: false, error: "缺少必需的提示词或文件输入" };
  }

  // 更新状态为加载中
  updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
    status: "loading",
    error: undefined,
    outputContent: "",
  });

  try {
    // 检查中断
    if (signal?.aborted) {
      updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
        status: "idle",
      });
      return { success: false, error: "已取消" };
    }

    const response = await generateLLMContent({
      prompt: prompt || "请分析这个文件的内容",
      model: data.model,
      systemPrompt: data.systemPrompt || undefined,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      files: files.length > 0 ? files : undefined,
    });

    // 检查中断
    if (signal?.aborted) {
      updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
        status: "idle",
      });
      return { success: false, error: "已取消" };
    }

    if (response.error) {
      updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
        status: "error",
        error: response.error,
        errorDetails: response.errorDetails,
      });
      return { success: false, error: response.error };
    }

    // 更新成功状态
    updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
      status: "success",
      outputContent: response.content,
      error: undefined,
    });

    return {
      success: true,
      output: { content: response.content },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "执行失败";

    updateNodeDataWithCanvas<LLMContentNodeData>(node.id, canvasId, {
      status: "error",
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 执行视频生成节点
 */
async function executeVideoGeneratorNode(
  node: CustomNode,
  canvasId: string,
  signal?: AbortSignal
): Promise<NodeExecutionResult> {
  const data = node.data as VideoGeneratorNodeData;
  // 使用画布感知的数据读取，解决画布切换问题（异步从文件加载图片）
  const { prompt, images } = await getConnectedInputDataFromCanvas(node.id, canvasId);

  // 验证输入
  if (!prompt) {
    updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
      status: "error",
      error: "缺少必需的提示词输入",
    });
    return { success: false, error: "缺少必需的提示词输入" };
  }

  // 更新状态为加载中
  updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
    status: "loading",
    error: undefined,
    taskStage: "queued",
    progress: 0,
  });

  try {
    // 检查是否已取消
    if (signal?.aborted) {
      updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
        status: "idle",
      });
      return { success: false, error: "已取消" };
    }

    // 创建任务（传递 signal 以支持取消）
    const createResult = await createVideoTask({
      prompt,
      model: data.model,
      seconds: data.seconds,
      size: data.size,
      inputImage: images.length > 0 ? images[0] : undefined,
    }, signal);

    if (createResult.error || !createResult.taskId) {
      const errorMsg = createResult.error || "创建任务失败";
      updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
        status: "error",
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    const taskId = createResult.taskId;

    // 更新任务 ID
    updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
      taskId,
      taskStage: "queued",
    });

    // 轮询等待完成（传递 signal 以支持取消）
    const pollResult = await pollVideoTask(taskId, (info) => {
      // 检查中断
      if (signal?.aborted) return;

      // 更新进度
      updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
        progress: info.progress,
        taskStage: info.stage,
      });
    }, 120, 5000, signal);

    // 检查中断
    if (signal?.aborted) {
      updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
        status: "idle",
        taskStage: undefined,
        progress: undefined,
      });
      return { success: false, error: "已取消" };
    }

    if (pollResult.error) {
      updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
        status: "error",
        error: pollResult.error,
        taskStage: "failed",
      });
      return { success: false, error: pollResult.error };
    }

    // 更新成功状态
    updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
      status: "success",
      taskStage: "completed",
      progress: 100,
      error: undefined,
    });

    return {
      success: true,
      output: { taskId },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "执行失败";

    updateNodeDataWithCanvas<VideoGeneratorNodeData>(node.id, canvasId, {
      status: "error",
      error: errorMessage,
      taskStage: "failed",
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 执行 PPT 内容生成节点
 * 注意：PPT 节点需要两阶段执行（大纲+图片），这里只触发开始
 * 由于 PPT 节点内部已经有复杂的执行逻辑，这里简化处理
 */
async function executePPTContentNode(
  node: CustomNode,
  canvasId: string,
  _signal?: AbortSignal
): Promise<NodeExecutionResult> {
  const data = node.data as PPTContentNodeData;
  // 使用画布感知的数据读取，解决画布切换问题（异步从文件加载图片）
  const { prompt, files } = await getConnectedInputDataFromCanvas(node.id, canvasId);

  // 验证输入
  if (!prompt && files.length === 0) {
    const errorMsg = "缺少必需的提示词或文件输入";
    updateNodeDataWithCanvas<PPTContentNodeData>(node.id, canvasId, {
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // 检查大纲状态
  if (data.outlineStatus !== "ready") {
    // 大纲未生成，提示用户需要先生成大纲
    const errorMsg = "请先手动生成 PPT 大纲，然后再运行工作流";
    updateNodeDataWithCanvas<PPTContentNodeData>(node.id, canvasId, {
      error: errorMsg,
    });
    return {
      success: false,
      error: errorMsg,
    };
  }

  // 检查是否有待生成的页面
  const pendingPages = data.pages?.filter((p) => p.status === "pending") || [];
  if (pendingPages.length === 0) {
    // 所有页面已完成或没有页面
    if (data.pages && data.pages.length > 0) {
      return { success: true }; // 已经完成了
    }
    const errorMsg = "没有待生成的页面";
    updateNodeDataWithCanvas<PPTContentNodeData>(node.id, canvasId, {
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // PPT 节点的执行逻辑较复杂，涉及多页面并发生成
  // 这里返回提示，建议用户手动触发 PPT 节点
  // 未来可以扩展为调用 PPT 节点内部的 startGeneration 函数
  const errorMsg = "PPT 节点请手动点击生成按钮执行，暂不支持自动工作流执行";
  updateNodeDataWithCanvas<PPTContentNodeData>(node.id, canvasId, {
    error: errorMsg,
  });
  return {
    success: false,
    error: errorMsg,
  };
}

/**
 * 节点执行器类
 */
export class NodeExecutor {
  /**
   * 执行单个节点
   */
  async executeNode(
    node: CustomNode,
    canvasId: string,
    signal?: AbortSignal
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;

    // 检查是否应该跳过
    if (!nodeType || shouldSkipNode(nodeType)) {
      return { success: true }; // 跳过的节点视为成功
    }

    // 根据节点类型分发执行
    switch (nodeType) {
      case "imageGeneratorProNode":
      case "imageGeneratorFastNode":
        return executeImageGeneratorNode(node, canvasId, signal);

      case "llmContentNode":
        return executeLLMContentNode(node, canvasId, signal);

      case "videoGeneratorNode":
        return executeVideoGeneratorNode(node, canvasId, signal);

      case "pptContentNode":
        return executePPTContentNode(node, canvasId, signal);

      default:
        // 未知节点类型，跳过
        console.warn(`[NodeExecutor] 未知节点类型: ${nodeType}`);
        return { success: true };
    }
  }
}

// 导出单例
export const nodeExecutor = new NodeExecutor();
