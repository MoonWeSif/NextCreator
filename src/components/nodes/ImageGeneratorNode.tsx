import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Sparkles, Zap, Play, AlertCircle, Maximize2, AlertTriangle, CircleAlert } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { generateImage, editImage } from "@/services/imageGeneration";
import { saveImage, getImageUrl, type InputImageInfo } from "@/services/fileStorageService";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import type { ImageGeneratorNodeData, ImageInputNodeData, ModelType } from "@/types";

// 定义节点类型
type ImageGeneratorNode = Node<ImageGeneratorNodeData>;

// Pro 节点预设模型选项
const proPresetModels = [
  { value: "gemini-3-pro-image-preview", label: "NanoBanana Pro" },
];

// Fast 节点预设模型选项
const fastPresetModels = [
  { value: "gemini-2.5-flash-image", label: "NanoBanana" },
];

// 基础宽高比选项（NanoBanana 使用）
const basicAspectRatioOptions = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

// Pro 宽高比选项（NanoBanana Pro 使用，支持更多比例）
const proAspectRatioOptions = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "5:4", label: "5:4" },
  { value: "4:5", label: "4:5" },
  { value: "21:9", label: "21:9" },
];

const imageSizeOptions = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

// 通用图片生成器节点组件
function ImageGeneratorBase({
  id,
  data,
  selected,
  isPro,
}: NodeProps<ImageGeneratorNode> & { isPro: boolean }) {
  const { updateNodeData, getConnectedInputData, getConnectedInputDataAsync, getEmptyConnectedInputs, getConnectedImagesWithInfo } = useFlowStore();
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  // 省略号加载动画
  const dots = useLoadingDots(data.status === "loading");

  // 检测空输入连接
  const emptyInputs = getEmptyConnectedInputs(id);
  const hasEmptyImageInputs = emptyInputs.emptyImages.length > 0;

  // 检测是否连接了提示词（包括空提示词的情况）
  const { prompt } = getConnectedInputData(id);
  const isPromptConnected = prompt !== undefined;

  // 保存生成时的画布 ID，用于确保结果更新到正确的画布
  const canvasIdRef = useRef<string | null>(null);

  // 获取对应的预设模型列表
  const presetModels = isPro ? proPresetModels : fastPresetModels;

  // 默认模型
  const defaultModel: ModelType = isPro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

  // 使用节点数据中的模型，如果没有则使用默认模型
  const model: ModelType = data.model || defaultModel;

  // 处理模型变更
  const handleModelChange = (value: string) => {
    updateNodeData<ImageGeneratorNodeData>(id, { model: value });
  };

  /**
   * 更新节点数据，同时更新 canvasStore 确保画布切换后数据正确
   */
  const updateNodeDataWithCanvas = useCallback((nodeId: string, nodeData: Partial<ImageGeneratorNodeData>) => {
    const { activeCanvasId } = useCanvasStore.getState();
    const targetCanvasId = canvasIdRef.current;

    // 始终更新 flowStore（当前活跃画布的数据）
    updateNodeData<ImageGeneratorNodeData>(nodeId, nodeData);

    // 如果目标画布不是当前活跃画布，也需要更新 canvasStore
    if (targetCanvasId && targetCanvasId !== activeCanvasId) {
      const canvasStore = useCanvasStore.getState();
      const canvas = canvasStore.canvases.find(c => c.id === targetCanvasId);

      if (canvas) {
        const updatedNodes = canvas.nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...nodeData },
            };
          }
          return node;
        });

        useCanvasStore.setState(state => ({
          canvases: state.canvases.map(c =>
            c.id === targetCanvasId
              ? { ...c, nodes: updatedNodes, updatedAt: Date.now() }
              : c
          ),
        }));
      }
    }
  }, [updateNodeData]);

  const handleGenerate = useCallback(async () => {
    // 使用异步版本从文件按需加载图片数据
    const { prompt, images } = await getConnectedInputDataAsync(id);
    const { activeCanvasId } = useCanvasStore.getState();

    // 记录当前画布 ID
    canvasIdRef.current = activeCanvasId;

    if (!prompt) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    updateNodeDataWithCanvas(id, {
      status: "loading",
      error: undefined,
    });

    try {
      // 根据 isPro 确定节点类型
      const nodeType = isPro ? "imageGeneratorPro" : "imageGeneratorFast";

      const response = images.length > 0
        ? await editImage({
            prompt,
            model,
            inputImages: images,
            aspectRatio: data.aspectRatio,
            imageSize: isPro ? data.imageSize : undefined,
          }, nodeType)
        : await generateImage({
            prompt,
            model,
            aspectRatio: data.aspectRatio,
            imageSize: isPro ? data.imageSize : undefined,
          }, nodeType);

      if (response.imageData) {
        if (activeCanvasId) {
          try {
            // 1. 先处理输入图片（如果有且未保存到文件系统）
            const connectedImages = getConnectedImagesWithInfo(id);
            const inputImagesMetadata: InputImageInfo[] = [];

            for (const img of connectedImages) {
              let imagePath = img.imagePath;

              // 如果输入图片还没有保存到文件系统，现在保存
              if (!imagePath && img.imageData) {
                try {
                  const inputImageInfo = await saveImage(
                    img.imageData,
                    activeCanvasId,
                    img.id,  // 输入图片节点的 ID
                    undefined,
                    undefined,
                    "input"
                  );
                  imagePath = inputImageInfo.path;

                  // 更新输入图片节点的路径，避免下次重复保存
                  updateNodeData<ImageInputNodeData>(img.id, {
                    imagePath: inputImageInfo.path,
                  });
                } catch (err) {
                  console.warn("保存输入图片失败:", err);
                }
              }

              // 添加到元数据（有路径才添加）
              if (imagePath) {
                inputImagesMetadata.push({
                  path: imagePath,
                  label: img.fileName || "输入图片",
                });
              }
            }

            // 2. 保存生成的图片和元数据
            const imageInfo = await saveImage(
              response.imageData,
              activeCanvasId,
              id,
              prompt,
              inputImagesMetadata.length > 0 ? inputImagesMetadata : undefined,
              "generated"
            );

            // 内存优化：只保存文件路径，不保存 base64 到内存
            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: undefined,  // 不再保存 base64 到内存
              outputImagePath: imageInfo.path,
              error: undefined,
            });
          } catch (saveError) {
            // 如果文件保存失败，回退到仅 base64 存储
            console.warn("文件保存失败，回退到 base64 存储:", saveError);
            updateNodeDataWithCanvas(id, {
              status: "success",
              outputImage: response.imageData,
              outputImagePath: undefined,
              error: undefined,
            });
          }
        } else {
          // 没有画布 ID，使用 base64 存储
          updateNodeDataWithCanvas(id, {
            status: "success",
            outputImage: response.imageData,
            outputImagePath: undefined,
            error: undefined,
          });
        }
      } else if (response.error) {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: response.error,
          errorDetails: response.errorDetails,
        });
      } else {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: "未返回图片数据",
          errorDetails: undefined,
        });
      }
    } catch {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "生成失败",
        errorDetails: undefined,
      });
    }
  }, [id, model, data.aspectRatio, data.imageSize, isPro, updateNodeDataWithCanvas, getConnectedInputDataAsync, getConnectedImagesWithInfo]);

  // 节点样式配置
  const headerGradient = isPro
    ? "bg-gradient-to-r from-purple-500 to-pink-500"
    : "bg-gradient-to-r from-amber-500 to-orange-500";
  const outputHandleColor = isPro ? "!bg-pink-500" : "!bg-orange-500";

  return (
    <>
      <div
        className={`
          w-[220px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
          ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
        `}
      >
        {/* 输入端口 - prompt 类型（上方） */}
        <Handle
          type="target"
          position={Position.Left}
          id="input-prompt"
          style={{ top: "30%" }}
          className={`!w-3 !h-3 !bg-blue-500 !border-2 !border-white`}
        />
        {/* prompt 端口标签 */}
        <div
          className="absolute -left-9 text-[10px] text-base-content/50 tooltip tooltip-left"
          style={{ top: "30%", transform: "translateY(-100%)" }}
          data-tip="支持多个输入，将自动拼接"
        >
          提示词
        </div>
        {/* 输入端口 - image 类型（下方） */}
        <Handle
          type="target"
          position={Position.Left}
          id="input-image"
          style={{ top: "70%" }}
          className={`!w-3 !h-3 !bg-green-500 !border-2 !border-white`}
        />
        {/* image 端口标签 */}
        <div
          className="absolute -left-9 text-[10px] text-base-content/50"
          style={{ top: "70%", transform: "translateY(-100%)" }}
        >
          参考图
        </div>

        {/* 节点头部 */}
        <div className={`flex items-center justify-between px-3 py-2 ${headerGradient} rounded-t-lg`}>
          <div className="flex items-center gap-2">
            {isPro ? (
              <Sparkles className="w-4 h-4 text-white" />
            ) : (
              <Zap className="w-4 h-4 text-white" />
            )}
            <span className="text-sm font-medium text-white">{data.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* 未连接提示词警告 */}
            {!isPromptConnected && (
              <div className="tooltip tooltip-left" data-tip="请连接提示词节点">
                <CircleAlert className="w-4 h-4 text-white/80" />
              </div>
            )}
            {/* 空输入警告图标 */}
            {isPromptConnected && hasEmptyImageInputs && (
              <div className="tooltip tooltip-left" data-tip={`图片输入为空: ${emptyInputs.emptyImages.map(i => i.label).join(", ")}`}>
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
              </div>
            )}
            {isPro && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">PRO</span>
            )}
          </div>
        </div>

        {/* 节点内容 */}
        <div className="p-2 space-y-2 nodrag">
          {/* 模型选择 - 使用 Portal 渲染避免模糊 */}
          <ModelSelector
            value={model}
            options={presetModels}
            onChange={handleModelChange}
            variant={isPro ? "primary" : "warning"}
            allowCustom={true}
            modelCategory="imageGenerator"
          />

          {/* 配置选项 */}
          <div className="space-y-1.5">
            <div>
              <label className="text-xs text-base-content/60 mb-0.5 block">宽高比</label>
              <div className="grid grid-cols-5 gap-1">
                {(isPro ? proAspectRatioOptions : basicAspectRatioOptions).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`
                      btn btn-xs px-0
                      ${ (data.aspectRatio || "1:1") === opt.value
                        ? (isPro ? "btn-primary" : "btn-warning")
                        : "btn-ghost bg-base-200"
                      }
                    `}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNodeData<ImageGeneratorNodeData>(id, {
                        aspectRatio: opt.value as ImageGeneratorNodeData["aspectRatio"],
                      });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {isPro && (
              <div>
                <label className="text-xs text-base-content/60 mb-0.5 block">分辨率</label>
                <div className="grid grid-cols-3 gap-1">
                  {imageSizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`
                        btn btn-xs
                        ${ (data.imageSize || "1K") === opt.value
                          ? "btn-primary"
                          : "btn-ghost bg-base-200"
                        }
                      `}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNodeData<ImageGeneratorNodeData>(id, {
                          imageSize: opt.value as ImageGeneratorNodeData["imageSize"],
                        });
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            className={`btn btn-sm w-full gap-2 ${
              data.status === "loading" || !isPromptConnected
                ? "btn-disabled"
                : isPro ? "btn-primary" : "btn-warning"
            }`}
            onClick={handleGenerate}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={data.status === "loading" || !isPromptConnected}
          >
            {data.status === "loading" ? (
              <span>生成中{dots}</span>
            ) : !isPromptConnected ? (
              <span className="text-base-content/50">待连接提示词</span>
            ) : (
              <>
                <Play className="w-4 h-4" />
                生成图片
              </>
            )}
          </button>

          {/* 错误信息 */}
          {data.status === "error" && data.error && (
            <div
              className="flex items-start gap-2 text-error text-xs bg-error/10 p-2 rounded cursor-pointer hover:bg-error/20 transition-colors"
              onClick={() => setShowErrorDetail(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-3 break-all">{data.error}</span>
            </div>
          )}

          {/* 预览图 - 桌面端使用本地文件存储 */}
          {(data.outputImage || data.outputImagePath) && (
            <div
              className="relative group cursor-pointer"
              onClick={() => setShowPreview(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-full h-[120px] overflow-hidden rounded-lg bg-base-200">
                <img
                  src={
                    data.outputImagePath
                      ? getImageUrl(data.outputImagePath)
                      : `data:image/png;base64,${data.outputImage}`
                  }
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* 输出端口 - image 类型 */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-image"
          className={`!w-3 !h-3 ${outputHandleColor} !border-2 !border-white`}
        />
      </div>

      {/* 预览弹窗 - 支持文件路径和 base64 */}
      {showPreview && (data.outputImage || data.outputImagePath) && (
        <ImagePreviewModal
          imageData={data.outputImage}
          imagePath={data.outputImagePath}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* 错误详情弹窗 */}
      {showErrorDetail && data.error && (
        <ErrorDetailModal
          error={data.error}
          errorDetails={data.errorDetails}
          title="执行错误"
          onClose={() => setShowErrorDetail(false)}
        />
      )}
    </>
  );
}

// NanoBanana Pro 节点 (支持 4K)
export const ImageGeneratorProNode = memo((props: NodeProps<ImageGeneratorNode>) => {
  return <ImageGeneratorBase {...props} isPro={true} />;
});
ImageGeneratorProNode.displayName = "ImageGeneratorProNode";

// NanoBanana 节点 (快速)
export const ImageGeneratorFastNode = memo((props: NodeProps<ImageGeneratorNode>) => {
  return <ImageGeneratorBase {...props} isPro={false} />;
});
ImageGeneratorFastNode.displayName = "ImageGeneratorFastNode";
