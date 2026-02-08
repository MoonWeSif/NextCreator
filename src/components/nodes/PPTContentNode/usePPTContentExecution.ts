import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { generateText, validateJsonOutput } from "@/services/llmService";
import { editImage } from "@/services/imageService";
import { saveImage, isTauriEnvironment } from "@/services/fileStorageService";
import { generateThumbnail } from "@/utils/imageCompression";
import type { PPTContentNodeData, PPTOutline, PPTPageItem, ConnectedImageInfo } from "./types";
import { buildSystemPrompt, buildPageImagePrompt, getVisualStylePrompt, PPT_OUTLINE_JSON_SCHEMA, DEFAULT_OUTLINE_MODEL, DEFAULT_IMAGE_MODEL } from "./types";

interface UsePPTContentExecutionProps {
  nodeId: string;
  data: PPTContentNodeData;
  getTemplateImage: () => string | undefined;
  getConnectedImages?: () => ConnectedImageInfo[];
}

export function usePPTContentExecution({
  nodeId,
  data,
  getTemplateImage,
  getConnectedImages,
}: UsePPTContentExecutionProps) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const getConnectedImagesWithInfo = useFlowStore((state) => state.getConnectedImagesWithInfo);

  // 用于控制批量生成的暂停/停止
  const isPausedRef = useRef(false);
  const stopRequestedRef = useRef<Set<string>>(new Set());
  // AbortController Map 用于取消各个正在进行的 API 请求
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // 记录执行开始时的画布 ID，确保结果更新到正确的画布
  const canvasIdRef = useRef<string | null>(null);

  /**
   * 画布感知的节点数据更新函数
   * 即使用户切换了画布，也能正确更新原画布中的节点数据
   */
  const updateNodeDataWithCanvas = useCallback(
    (nodeData: Partial<PPTContentNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      // 始终更新 flowStore（当前活跃画布的数据）
      updateNodeData<PPTContentNodeData>(nodeId, nodeData);

      // 如果目标画布不是当前活跃画布，也需要更新 canvasStore
      if (targetCanvasId && targetCanvasId !== activeCanvasId) {
        const canvasStore = useCanvasStore.getState();
        const canvas = canvasStore.canvases.find((c) => c.id === targetCanvasId);

        if (canvas) {
          const updatedNodes = canvas.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: { ...node.data, ...nodeData },
              };
            }
            return node;
          });

          useCanvasStore.setState((state) => ({
            canvases: state.canvases.map((c) =>
              c.id === targetCanvasId
                ? { ...c, nodes: updatedNodes, updatedAt: Date.now() }
                : c
            ),
          }));
        }
      }
    },
    [nodeId, updateNodeData]
  );

  // 更新节点数据的辅助函数（使用画布感知更新）
  const update = useCallback(
    (updates: Partial<PPTContentNodeData>) => {
      updateNodeDataWithCanvas(updates);
    },
    [updateNodeDataWithCanvas]
  );

  // 原子更新单个页面状态（并发安全，画布感知）
  const updatePageState = useCallback(
    (pageId: string, pageUpdates: Partial<PPTPageItem>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      // 从正确的位置获取最新节点数据
      let currentData: PPTContentNodeData | undefined;

      if (targetCanvasId && targetCanvasId !== activeCanvasId) {
        // 如果目标画布不是当前活跃画布，从 canvasStore 读取
        const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
        const currentNode = canvas?.nodes.find((n) => n.id === nodeId);
        currentData = currentNode?.data as PPTContentNodeData | undefined;
      } else {
        // 从 flowStore 读取（当前活跃画布）
        const { nodes } = useFlowStore.getState();
        const currentNode = nodes.find((n) => n.id === nodeId);
        currentData = currentNode?.data as PPTContentNodeData | undefined;
      }

      if (!currentData) return;

      const updatedPages = currentData.pages.map((p) =>
        p.id === pageId ? { ...p, ...pageUpdates } : p
      );

      const newCompleted = updatedPages.filter(
        (p) => p.status === "completed" || p.status === "skipped"
      ).length;

      const nodeUpdate = {
        pages: updatedPages,
        progress: { completed: newCompleted, total: updatedPages.length },
      };

      // 使用画布感知更新
      updateNodeDataWithCanvas(nodeUpdate);
    },
    [nodeId, updateNodeDataWithCanvas]
  );

  // === 阶段一：生成大纲 ===
  const generateOutline = useCallback(
    async (prompt: string, files?: Array<{ data: string; mimeType: string; fileName?: string }>) => {
      // 记录当前画布 ID，确保结果更新到正确的画布
      const { activeCanvasId } = useCanvasStore.getState();
      canvasIdRef.current = activeCanvasId;

      update({
        outlineStatus: "generating",
        outlineError: undefined,
      });

      try {
        // 根据配置构建系统提示词
        const systemPrompt = buildSystemPrompt(data.outlineConfig);

        // 使用用户配置的模型或默认模型
        const modelToUse = data.outlineModel || DEFAULT_OUTLINE_MODEL;

        // 使用结构化输出确保返回有效的 JSON
        const response = await generateText({
          prompt,
          model: modelToUse,
          systemPrompt,
          files,
          responseJsonSchema: PPT_OUTLINE_JSON_SCHEMA,
        });

        if (response.error) {
          update({
            outlineStatus: "error",
            outlineError: response.error,
          });
          return;
        }

        if (!response.content) {
          update({
            outlineStatus: "error",
            outlineError: "LLM 未返回内容",
          });
          return;
        }

        // 使用结构化输出后，返回的内容应该是有效的 JSON，但仍然验证以确保安全
        let outline: PPTOutline;
        try {
          outline = JSON.parse(response.content) as PPTOutline;
        } catch {
          // 如果解析失败，尝试使用原有的验证逻辑
          const validation = validateJsonOutput(response.content);
          if (!validation.valid || !validation.data) {
            update({
              outlineStatus: "error",
              outlineError: validation.error || "JSON 解析失败",
            });
            return;
          }
          outline = validation.data as PPTOutline;
        }

        // 验证大纲结构
        if (!outline.title || !Array.isArray(outline.pages) || outline.pages.length === 0) {
          update({
            outlineStatus: "error",
            outlineError: "大纲格式不正确：缺少标题或页面",
          });
          return;
        }

        // 初始化页面列表
        const pages: PPTPageItem[] = outline.pages.map((page, index) => ({
          id: uuidv4(),
          pageNumber: page.pageNumber || index + 1,
          heading: page.heading || "",
          points: page.points || [],
          imageDesc: page.imageDesc,
          script: page.script || "",
          supplement: page.supplement,
          status: "pending",
        }));

        update({
          outlineStatus: "ready",
          outline,
          pages,
          progress: { completed: 0, total: pages.length },
        });
      } catch (error) {
        update({
          outlineStatus: "error",
          outlineError: error instanceof Error ? error.message : "生成大纲时发生错误",
        });
      }
    },
    [data.outlineConfig, data.outlineModel, update]
  );

  // 更新大纲（用户编辑后）
  const updateOutline = useCallback(
    (outline: PPTOutline) => {
      // 同时更新 pages 列表
      const newPages: PPTPageItem[] = outline.pages.map((page, index) => {
        // 尝试找到现有的页面数据
        const existingPage = data.pages.find(
          (p) => p.pageNumber === page.pageNumber
        );

        if (existingPage) {
          return {
            ...existingPage,
            pageNumber: page.pageNumber,
            heading: page.heading,
            points: page.points,
            imageDesc: page.imageDesc,
            script: page.script,
            supplement: page.supplement,
          };
        }

        return {
          id: uuidv4(),
          pageNumber: page.pageNumber || index + 1,
          heading: page.heading || "",
          points: page.points || [],
          imageDesc: page.imageDesc,
          script: page.script || "",
          supplement: page.supplement,
          status: "pending" as const,
        };
      });

      // 重新计算进度
      const completed = newPages.filter(
        (p) => p.status === "completed" || p.status === "skipped"
      ).length;

      update({
        outline,
        pages: newPages,
        progress: { completed, total: newPages.length },
      });
    },
    [data.pages, update]
  );

  // === 阶段二：批量图片生成 ===

  // 生成单页图片（使用模板基底图 + 完整页面内容提示词）
  const generatePageImage = useCallback(
    async (pageId: string): Promise<boolean> => {
      const page = data.pages.find((p) => p.id === pageId);
      if (!page) return false;

      // 检查是否已暂停
      if (isPausedRef.current) {
        return false;
      }

      // 更新状态为 running（原子操作）
      updatePageState(pageId, { status: "running", error: undefined });

      // 创建新的 AbortController 并存入 Map
      const abortController = new AbortController();
      abortControllersRef.current.set(pageId, abortController);

      try {
        const templateImage = getTemplateImage();

        // 检查是否被停止
        if (stopRequestedRef.current.has(pageId) || isPausedRef.current) {
          stopRequestedRef.current.delete(pageId);
          updatePageState(pageId, { status: "pending" });
          return false;
        }

        // 获取所有连接的图片信息（用于补充图片）
        const allConnectedImages = getConnectedImages?.() || getConnectedImagesWithInfo(nodeId);

        // 获取当前页引用的补充图片
        const supplementImageRefs = page.supplement?.imageRefs || [];
        const supplementImages = supplementImageRefs
          .map(refId => allConnectedImages.find(img => img.id === refId))
          .filter((img): img is ConnectedImageInfo => !!img);

        // 判断是否为标题页（第一页且开启了标题页模式）
        const isTitlePage = page.pageNumber === 1 && data.firstPageIsTitlePage;

        // 构建完整的页面图片生成提示词（使用视觉风格模板，包含补充信息）
        const visualStylePrompt = getVisualStylePrompt(data.visualStyleTemplate, data.customVisualStylePrompt);
        const prompt = buildPageImagePrompt(
          page,
          visualStylePrompt,
          supplementImages.map(img => ({ fileName: img.fileName || `图片-${img.id.slice(0, 4)}` })),
          isTitlePage
        );

        // 必须有模板基底图
        if (!templateImage) {
          updatePageState(pageId, { status: "failed", error: "请上传模板基底图" });
          return false;
        }

        // 准备输入图片：基底图 + 补充图片
        const inputImages = [templateImage];
        if (supplementImages.length > 0) {
          inputImages.push(...supplementImages.map(img => img.imageData));
        }

        // 使用模板基底图 + 完整提示词生成 PPT 页面
        // 使用用户配置的图片模型或默认模型
        const imageModelToUse = data.imageModel || DEFAULT_IMAGE_MODEL;
        const response = await editImage(
          {
            prompt,
            model: imageModelToUse,
            inputImages,
            aspectRatio: data.imageConfig.aspectRatio,
            imageSize: data.imageConfig.imageSize,
          },
          "imageGeneratorPro",
          abortController.signal
        );

        // 检查是否被中断
        if (response.error === "已取消") {
          updatePageState(pageId, { status: "pending", error: undefined });
          return false;
        }

        if (response.error) {
          updatePageState(pageId, { status: "failed", error: response.error });
          return false;
        }

        if (!response.imageData) {
          updatePageState(pageId, { status: "failed", error: "未返回图片数据" });
          return false;
        }

        // 获取当前页面的 attempts 数（从正确的画布读取）
        const targetCanvasId = canvasIdRef.current;
        const currentActiveId = useCanvasStore.getState().activeCanvasId;
        let currentPage: PPTPageItem | undefined;

        if (targetCanvasId && targetCanvasId !== currentActiveId) {
          // 从 canvasStore 读取
          const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
          const currentNode = canvas?.nodes.find((n) => n.id === nodeId);
          const currentData = currentNode?.data as PPTContentNodeData | undefined;
          currentPage = currentData?.pages.find((p) => p.id === pageId);
        } else {
          // 从 flowStore 读取
          const { nodes } = useFlowStore.getState();
          const currentNode = nodes.find((n) => n.id === nodeId);
          const currentData = currentNode?.data as PPTContentNodeData | undefined;
          currentPage = currentData?.pages.find((p) => p.id === pageId);
        }
        const attempts = (currentPage?.result?.attempts || 0) + 1;

        // 在 Tauri 环境下保存图片到文件系统（使用原始画布 ID）
        let imagePath: string | undefined;
        let thumbnailPath: string | undefined;
        const saveCanvasId = targetCanvasId || currentActiveId;
        if (isTauriEnvironment() && saveCanvasId) {
          try {
            const imageInfo = await saveImage(
              response.imageData,
              saveCanvasId,
              `${nodeId}-page-${page.pageNumber}`
            );
            imagePath = imageInfo.path;
          } catch (saveError) {
            // 文件保存失败不影响主流程，只是没有本地存储
            console.warn("PPT 页面图片保存到文件系统失败:", saveError);
          }
        }

        // 生成缩略图用于画布预览（减少内存占用）
        let thumbnail: string | undefined;
        try {
          thumbnail = await generateThumbnail(response.imageData, {
            maxWidth: 800,
            quality: 0.85,
            format: "jpeg",
          });

          // 在 Tauri 环境下也保存缩略图
          if (isTauriEnvironment() && saveCanvasId && thumbnail) {
            try {
              const thumbInfo = await saveImage(
                thumbnail,
                saveCanvasId,
                `${nodeId}-page-${page.pageNumber}-thumb`
              );
              thumbnailPath = thumbInfo.path;
            } catch (thumbSaveError) {
              console.warn("缩略图保存失败:", thumbSaveError);
            }
          }
        } catch (thumbError) {
          console.warn("缩略图生成失败:", thumbError);
        }

        // 更新为成功状态（原子操作）
        updatePageState(pageId, {
          status: "completed",
          result: {
            image: response.imageData,
            imagePath,
            thumbnail,
            thumbnailPath,
            generatedAt: Date.now(),
            attempts,
          },
          error: undefined,
        });

        return true;
      } catch (error) {
        // 检查是否是中断错误
        if (error instanceof Error && error.name === "AbortError") {
          updatePageState(pageId, { status: "pending", error: undefined });
          return false;
        }

        updatePageState(pageId, {
          status: "failed",
          error: error instanceof Error ? error.message : "生成失败",
        });
        return false;
      } finally {
        abortControllersRef.current.delete(pageId);
      }
    },
    [data.pages, data.imageConfig.aspectRatio, data.imageConfig.imageSize, data.imageModel, data.visualStyleTemplate, data.customVisualStylePrompt, data.firstPageIsTitlePage, getTemplateImage, nodeId, updatePageState, getConnectedImages, getConnectedImagesWithInfo]
  );

  // 开始批量生成（并发执行所有待处理任务）
  const startGeneration = useCallback(async () => {
    // 记录当前画布 ID，确保结果更新到正确的画布
    const { activeCanvasId } = useCanvasStore.getState();
    canvasIdRef.current = activeCanvasId;

    isPausedRef.current = false;
    update({ generationStatus: "running" });

    // 获取所有待处理的页面
    const pendingPages = data.pages.filter((p) => p.status === "pending");

    if (pendingPages.length === 0) {
      update({ generationStatus: "completed" });
      return;
    }

    // 并发执行所有待处理页面的生成
    await Promise.all(pendingPages.map((page) => generatePageImage(page.id)));

    // 检查最终状态（从正确的画布读取）
    const targetCanvasId = canvasIdRef.current;
    const currentActiveId = useCanvasStore.getState().activeCanvasId;
    let finalPages: PPTPageItem[];

    if (targetCanvasId && targetCanvasId !== currentActiveId) {
      // 从 canvasStore 读取
      const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
      const currentNode = canvas?.nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      finalPages = currentData?.pages || data.pages;
    } else {
      // 从 flowStore 读取
      const { nodes } = useFlowStore.getState();
      const currentNode = nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      finalPages = currentData?.pages || data.pages;
    }

    const hasFailed = finalPages.some((p) => p.status === "failed");
    const allDone = finalPages.every(
      (p) => p.status === "completed" || p.status === "skipped" || p.status === "failed"
    );

    // 如果被暂停了，不更新状态为 completed
    if (isPausedRef.current) {
      return;
    }

    if (allDone) {
      update({
        generationStatus: hasFailed ? "error" : "completed",
      });
    }
  }, [data.pages, generatePageImage, nodeId, update]);

  // 暂停/停止生成 - 硬停止：立即中断所有请求，重置所有正在运行的页面状态
  const pauseGeneration = useCallback(() => {
    // 立即设置暂停标志
    isPausedRef.current = true;

    // 中断所有正在进行的 API 请求
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // 硬停止：立即重置所有 running 状态的页面为 pending
    const { activeCanvasId } = useCanvasStore.getState();
    const targetCanvasId = canvasIdRef.current || activeCanvasId;

    let currentPages: PPTPageItem[];
    if (targetCanvasId && targetCanvasId !== activeCanvasId) {
      const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
      const currentNode = canvas?.nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      currentPages = currentData?.pages || [];
    } else {
      const { nodes } = useFlowStore.getState();
      const currentNode = nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      currentPages = currentData?.pages || [];
    }

    // 重置所有 running 的页面为 pending
    const resetPages = currentPages.map((p) =>
      p.status === "running" ? { ...p, status: "pending" as const, error: undefined } : p
    );

    // 重新计算进度
    const completed = resetPages.filter(
      (p) => p.status === "completed" || p.status === "skipped"
    ).length;

    // 直接更新状态为 paused
    updateNodeDataWithCanvas({
      pages: resetPages,
      progress: { completed, total: resetPages.length },
      generationStatus: "paused",
    });
  }, [nodeId, updateNodeDataWithCanvas]);

  // 恢复生成
  const resumeGeneration = useCallback(async () => {
    isPausedRef.current = false;
    await startGeneration();
  }, [startGeneration]);

  // 重试失败的页面
  const retryFailed = useCallback(async () => {
    // 将失败的页面状态重置为 pending
    const resetPages = data.pages.map((p) =>
      p.status === "failed" ? { ...p, status: "pending" as const, error: undefined } : p
    );
    update({ pages: resetPages, generationStatus: "idle" });

    // 延迟后开始生成
    await new Promise((resolve) => setTimeout(resolve, 100));
    await startGeneration();
  }, [data.pages, startGeneration, update]);

  // 单页操作
  const retryPage = useCallback(
    async (pageId: string) => {
      // 记录当前画布 ID
      const { activeCanvasId } = useCanvasStore.getState();
      canvasIdRef.current = activeCanvasId;

      // 如果当前是 idle 状态，设置为 running
      const { nodes } = useFlowStore.getState();
      const currentNode = nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      if (currentData?.generationStatus === "idle" || currentData?.generationStatus === "completed") {
        update({ generationStatus: "running" });
      }

      updatePageState(pageId, { status: "pending", error: undefined });
      await generatePageImage(pageId);

      // 生成完成后，检查是否所有任务都已完成（从正确的画布读取）
      const targetCanvasId = canvasIdRef.current;
      const currentActiveId = useCanvasStore.getState().activeCanvasId;
      let latestData: PPTContentNodeData | undefined;

      if (targetCanvasId && targetCanvasId !== currentActiveId) {
        const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
        const latestNode = canvas?.nodes.find((n) => n.id === nodeId);
        latestData = latestNode?.data as PPTContentNodeData | undefined;
      } else {
        const { nodes: latestNodes } = useFlowStore.getState();
        const latestNode = latestNodes.find((n) => n.id === nodeId);
        latestData = latestNode?.data as PPTContentNodeData | undefined;
      }

      if (latestData) {
        const allDone = latestData.pages.every(
          (p) => p.status === "completed" || p.status === "skipped" || p.status === "failed"
        );
        const hasRunning = latestData.pages.some((p) => p.status === "running");
        const hasFailed = latestData.pages.some((p) => p.status === "failed");

        if (allDone && !hasRunning) {
          update({ generationStatus: hasFailed ? "idle" : "completed" });
        } else if (!hasRunning && !isPausedRef.current) {
          update({ generationStatus: "idle" });
        }
      }
    },
    [generatePageImage, nodeId, update, updatePageState]
  );

  const skipPage = useCallback(
    (pageId: string) => {
      // skipPage 是同步操作，无需记录画布 ID（使用当前画布）
      const { activeCanvasId } = useCanvasStore.getState();
      canvasIdRef.current = activeCanvasId;
      updatePageState(pageId, { status: "skipped" });
    },
    [updatePageState]
  );

  const runPage = useCallback(
    async (pageId: string) => {
      // 记录当前画布 ID
      const { activeCanvasId } = useCanvasStore.getState();
      canvasIdRef.current = activeCanvasId;

      // 如果当前是 idle 状态，设置为 running
      const { nodes } = useFlowStore.getState();
      const currentNode = nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data as PPTContentNodeData | undefined;
      if (currentData?.generationStatus === "idle" || currentData?.generationStatus === "completed") {
        update({ generationStatus: "running" });
      }

      await generatePageImage(pageId);

      // 生成完成后，检查是否所有任务都已完成（从正确的画布读取）
      const targetCanvasId = canvasIdRef.current;
      const currentActiveId = useCanvasStore.getState().activeCanvasId;
      let latestData: PPTContentNodeData | undefined;

      if (targetCanvasId && targetCanvasId !== currentActiveId) {
        const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
        const latestNode = canvas?.nodes.find((n) => n.id === nodeId);
        latestData = latestNode?.data as PPTContentNodeData | undefined;
      } else {
        const { nodes: latestNodes } = useFlowStore.getState();
        const latestNode = latestNodes.find((n) => n.id === nodeId);
        latestData = latestNode?.data as PPTContentNodeData | undefined;
      }

      if (latestData) {
        const allDone = latestData.pages.every(
          (p) => p.status === "completed" || p.status === "skipped" || p.status === "failed"
        );
        const hasRunning = latestData.pages.some((p) => p.status === "running");
        const hasFailed = latestData.pages.some((p) => p.status === "failed");

        if (allDone && !hasRunning) {
          update({ generationStatus: hasFailed ? "idle" : "completed" });
        } else if (!hasRunning && !isPausedRef.current) {
          // 如果没有正在运行的任务且不是暂停状态，设为 idle
          update({ generationStatus: "idle" });
        }
      }
    },
    [generatePageImage, nodeId, update]
  );

  const stopPage = useCallback(
    (pageId: string) => {
      // 添加到停止请求集合
      stopRequestedRef.current.add(pageId);
      // 如果有正在进行的请求，中断它
      const controller = abortControllersRef.current.get(pageId);
      if (controller) {
        controller.abort();
      }
    },
    []
  );

  const uploadPageImage = useCallback(
    async (pageId: string, imageData: string) => {
      // 记录当前画布 ID
      const { activeCanvasId } = useCanvasStore.getState();
      canvasIdRef.current = activeCanvasId;

      // 在 Tauri 环境下保存手动上传的图片到文件系统
      let manualImagePath: string | undefined;
      let manualThumbnailPath: string | undefined;

      // 获取页面信息用于生成文件名（从正确的画布读取）
      const targetCanvasId = canvasIdRef.current;
      let page: PPTPageItem | undefined;

      if (targetCanvasId && targetCanvasId !== activeCanvasId) {
        const canvas = useCanvasStore.getState().canvases.find((c) => c.id === targetCanvasId);
        const currentNode = canvas?.nodes.find((n) => n.id === nodeId);
        const currentData = currentNode?.data as PPTContentNodeData | undefined;
        page = currentData?.pages.find((p) => p.id === pageId);
      } else {
        const { nodes } = useFlowStore.getState();
        const currentNode = nodes.find((n) => n.id === nodeId);
        const currentData = currentNode?.data as PPTContentNodeData | undefined;
        page = currentData?.pages.find((p) => p.id === pageId);
      }

      if (isTauriEnvironment() && activeCanvasId) {
        try {
          const imageInfo = await saveImage(
            imageData,
            activeCanvasId,
            `${nodeId}-page-${page?.pageNumber || 'manual'}-upload`
          );
          manualImagePath = imageInfo.path;
        } catch (saveError) {
          console.warn("手动上传图片保存到文件系统失败:", saveError);
        }
      }

      // 生成缩略图用于画布预览
      let manualThumbnail: string | undefined;
      try {
        manualThumbnail = await generateThumbnail(imageData, {
          maxWidth: 800,
          quality: 0.85,
          format: "jpeg",
        });

        // 在 Tauri 环境下也保存缩略图
        if (isTauriEnvironment() && activeCanvasId && manualThumbnail) {
          try {
            const thumbInfo = await saveImage(
              manualThumbnail,
              activeCanvasId,
              `${nodeId}-page-${page?.pageNumber || 'manual'}-upload-thumb`
            );
            manualThumbnailPath = thumbInfo.path;
          } catch (thumbSaveError) {
            console.warn("手动上传缩略图保存失败:", thumbSaveError);
          }
        }
      } catch (thumbError) {
        console.warn("手动上传缩略图生成失败:", thumbError);
      }

      updatePageState(pageId, {
        manualImage: imageData,
        manualImagePath,
        manualThumbnail,
        manualThumbnailPath,
        status: "completed",
      });
    },
    [nodeId, updatePageState]
  );

  return {
    // 大纲生成
    generateOutline,
    updateOutline,
    // 批量图片生成
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    retryFailed,
    // 单页操作
    retryPage,
    skipPage,
    runPage,
    stopPage,
    uploadPageImage,
  };
}
