import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Wand2, Play, AlertCircle, Maximize2, AlertTriangle, CircleAlert } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { editImage, generateImage } from "@/services/imageGeneration";
import { saveImage, getImageUrl, type InputImageInfo } from "@/services/fileStorageService";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import type { ImageInputNodeData, ModelType, ErrorDetails } from "@/types";

type GptImageSize = "auto" | `${number}x${number}`;
type GptImageSizeMode = "preset" | "custom";

// GPT Image 节点数据类型
interface GptImageGeneratorNodeData {
    [key: string]: unknown;
    label: string;
    model: ModelType;
    aspectRatio?: string;
    size?: GptImageSize;
    sizeMode?: GptImageSizeMode;
    customWidth?: number;
    customHeight?: number;
    quality: "auto" | "low" | "medium" | "high";
    background: "auto" | "transparent" | "opaque";
    outputFormat?: "png" | "jpeg" | "webp";
    moderation?: "auto" | "low";
    status: "idle" | "loading" | "success" | "error";
    outputImage?: string;
    outputImagePath?: string;
    error?: string;
    errorDetails?: ErrorDetails;
}

type GptImageGeneratorNode = Node<GptImageGeneratorNodeData>;

// 预设模型选项
const presetModels = [
    { value: "gpt-image-2", label: "GPT Image 2" },
    { value: "gpt-image-1.5", label: "GPT Image 1.5" },
    { value: "gpt-image-1", label: "GPT Image 1" },
    { value: "gpt-image-1-mini", label: "GPT Image Mini" },
];

// 质量选项 (GPT Image 使用 low/medium/high)
const qualityOptions = [
    { value: "auto", label: "自动" },
    { value: "low", label: "低" },
    { value: "medium", label: "中" },
    { value: "high", label: "高" },
];

const sizePresetOptions: Array<{ value: GptImageSize | "custom"; label: string }> = [
    { value: "auto", label: "自动" },
    { value: "1024x1024", label: "1:1 1024" },
    { value: "2048x2048", label: "1:1 2048" },
    { value: "2880x2880", label: "1:1 最大" },
    { value: "1536x864", label: "16:9 1536" },
    { value: "2048x1152", label: "16:9 2048" },
    { value: "3840x2160", label: "16:9 4K" },
    { value: "864x1536", label: "9:16 1536" },
    { value: "1152x2048", label: "9:16 2048" },
    { value: "2160x3840", label: "9:16 4K" },
    { value: "1536x1152", label: "4:3 1536" },
    { value: "1152x1536", label: "3:4 1536" },
    { value: "1536x1024", label: "3:2 1536" },
    { value: "1024x1536", label: "2:3 1536" },
    { value: "1600x1280", label: "5:4 1600" },
    { value: "1280x1600", label: "4:5 1600" },
    { value: "1792x768", label: "21:9 1792" },
    { value: "2304x768", label: "3:1 2304" },
    { value: "custom", label: "自定义" },
];

const sizePresetValues = new Set(
    sizePresetOptions
        .map((opt) => opt.value)
        .filter((value): value is GptImageSize => value !== "custom")
);

function parseSize(size?: string): { width: number; height: number } | null {
    const match = size?.match(/^(\d+)x(\d+)$/);
    if (!match) return null;

    return {
        width: Number(match[1]),
        height: Number(match[2]),
    };
}

function getCustomDimensions(data: GptImageGeneratorNodeData) {
    const parsedSize = parseSize(data.size);
    return {
        width: data.customWidth || parsedSize?.width || 1024,
        height: data.customHeight || parsedSize?.height || 1024,
    };
}

function getSizeMode(data: GptImageGeneratorNodeData): GptImageSizeMode {
    if (data.sizeMode) return data.sizeMode;
    return data.size && !sizePresetValues.has(data.size) ? "custom" : "preset";
}

function getResolvedSize(data: GptImageGeneratorNodeData): GptImageSize {
    if (getSizeMode(data) !== "custom") {
        return data.size || "auto";
    }

    const { width, height } = getCustomDimensions(data);
    return `${width}x${height}`;
}

function validateGptImage2Size(size: GptImageSize): string | undefined {
    if (size === "auto") return undefined;

    const parsed = parseSize(size);
    if (!parsed) return "尺寸格式无效";

    const { width, height } = parsed;
    if (width <= 0 || height <= 0) return "宽高必须大于 0";
    if (width % 16 !== 0 || height % 16 !== 0) return "宽高必须是 16 的倍数";
    if (Math.max(width, height) > 3840) return "最长边不能超过 3840";
    if (Math.max(width, height) / Math.min(width, height) > 3) return "宽高比不能超过 3:1";

    const pixels = width * height;
    if (pixels < 655360) return "总像素不能低于 655,360";
    if (pixels > 8294400) return "总像素不能超过 8,294,400";

    return undefined;
}

// 背景选项 (GPT Image 特有)
const backgroundOptions = [
    { value: "auto", label: "自动" },
    { value: "transparent", label: "透明" },
    { value: "opaque", label: "不透明" },
];

const outputFormatOptions = [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WebP" },
];

const moderationOptions = [
    { value: "auto", label: "标准" },
    { value: "low", label: "宽松" },
];

// GPT Image 节点组件
function GptImageGeneratorBase({
    id,
    data,
    selected,
}: NodeProps<GptImageGeneratorNode>) {
    const { updateNodeData, getConnectedInputDataAsync, getConnectedImagesWithInfo, getConnectedImagesWithInfoAsync } = useFlowStore();
    const [showPreview, setShowPreview] = useState(false);
    const [showErrorDetail, setShowErrorDetail] = useState(false);

    // 省略号加载动画
    const dots = useLoadingDots(data.status === "loading");

    // 使用缓存的连接状态检测，避免每次渲染遍历全图
    const { isPromptConnected, hasEmptyImageInputs, emptyImageLabels } = useNodeConnectionStatus(id);

    // 保存生成时的画布 ID
    const canvasIdRef = useRef<string | null>(null);

    // 默认模型
    const defaultModel: ModelType = "gpt-image-2";
    const model: ModelType = data.model || defaultModel;
    const sizeMode = getSizeMode(data);
    const resolvedSize = getResolvedSize(data);
    const customDimensions = getCustomDimensions(data);
    const sizeValidationError = validateGptImage2Size(resolvedSize);
    const sizeSelectValue = sizeMode === "custom" ? "custom" : (data.size || "auto");
    const backgroundOptionsForModel = model === "gpt-image-2"
        ? backgroundOptions.filter((opt) => opt.value !== "transparent")
        : backgroundOptions;

    // 处理模型变更
    const handleModelChange = (value: string) => {
        updateNodeData<GptImageGeneratorNodeData>(id, {
            model: value,
            background: value === "gpt-image-2" && data.background === "transparent"
                ? "auto"
                : data.background,
        });
    };

    // 更新节点数据，同时更新 canvasStore
    const updateNodeDataWithCanvas = useCallback((nodeId: string, nodeData: Partial<GptImageGeneratorNodeData>) => {
        const { activeCanvasId } = useCanvasStore.getState();
        const targetCanvasId = canvasIdRef.current;

        updateNodeData<GptImageGeneratorNodeData>(nodeId, nodeData);

        if (targetCanvasId && targetCanvasId !== activeCanvasId) {
            const canvasStore = useCanvasStore.getState();
            const canvas = canvasStore.canvases.find(c => c.id === targetCanvasId);

            if (canvas) {
                const updatedNodes = canvas.nodes.map(node => {
                    if (node.id === nodeId) {
                        return { ...node, data: { ...node.data, ...nodeData } };
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
        const { prompt } = await getConnectedInputDataAsync(id);
        const connectedImageDetails = await getConnectedImagesWithInfoAsync(id);
        const orderedImageDetails = [...connectedImageDetails].sort((a, b) => {
            return Number(!!b.hasMask && !!b.maskImageData) - Number(!!a.hasMask && !!a.maskImageData);
        });
        const inputImages = orderedImageDetails.map((img) => img.imageData).filter(Boolean);
        const maskImage = orderedImageDetails.find((img) => img.hasMask && img.maskImageData)?.maskImageData;
        const { activeCanvasId } = useCanvasStore.getState();
        canvasIdRef.current = activeCanvasId;

        if (!prompt) {
            updateNodeDataWithCanvas(id, { status: "error", error: "请连接提示词节点", errorDetails: undefined });
            return;
        }

        if (sizeValidationError) {
            updateNodeDataWithCanvas(id, { status: "error", error: sizeValidationError, errorDetails: undefined });
            return;
        }

        updateNodeDataWithCanvas(id, { status: "loading", error: undefined });

        try {
            const request = {
                prompt,
                model,
                inputImages: inputImages.length > 0 ? inputImages : undefined,
                maskImage,
                aspectRatio: data.aspectRatio,
                size: resolvedSize,
                quality: data.quality || "auto",
                background: data.background || "auto",
                outputFormat: data.outputFormat || "png",
                moderation: data.moderation || "auto",
            };

            const response = inputImages.length > 0
                ? await editImage(request, "gptImageGenerator")
                : await generateImage(request, "gptImageGenerator");

            if (response.imageData) {
                if (activeCanvasId) {
                    try {
                        const connectedImages = getConnectedImagesWithInfo(id);
                        const inputImagesMetadata: InputImageInfo[] = [];

                        for (const img of connectedImages) {
                            let imagePath = img.imagePath;
                            if (!imagePath && img.imageData) {
                                try {
                                    const inputImageInfo = await saveImage(img.imageData, activeCanvasId, img.id, undefined, undefined, "input");
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

                        const imageInfo = await saveImage(
                            response.imageData, activeCanvasId, id, prompt,
                            inputImagesMetadata.length > 0 ? inputImagesMetadata : undefined, "generated"
                        );

                        updateNodeDataWithCanvas(id, {
                            status: "success", outputImage: undefined,
                            outputImagePath: imageInfo.path, error: undefined,
                        });
                    } catch (saveError) {
                        console.warn("文件保存失败，回退到 base64 存储:", saveError);
                        updateNodeDataWithCanvas(id, {
                            status: "success", outputImage: response.imageData,
                            outputImagePath: undefined, error: undefined,
                        });
                    }
                } else {
                    updateNodeDataWithCanvas(id, {
                        status: "success", outputImage: response.imageData,
                        outputImagePath: undefined, error: undefined,
                    });
                }
            } else if (response.error) {
                updateNodeDataWithCanvas(id, {
                    status: "error", error: response.error, errorDetails: response.errorDetails,
                });
            } else {
                updateNodeDataWithCanvas(id, { status: "error", error: "未返回图片数据", errorDetails: undefined });
            }
        } catch {
            updateNodeDataWithCanvas(id, { status: "error", error: "生成失败", errorDetails: undefined });
        }
    }, [
        id,
        model,
        resolvedSize,
        sizeValidationError,
        data.aspectRatio,
        data.size,
        data.sizeMode,
        data.customWidth,
        data.customHeight,
        data.quality,
        data.background,
        data.outputFormat,
        data.moderation,
        updateNodeDataWithCanvas,
        getConnectedInputDataAsync,
        getConnectedImagesWithInfo,
        getConnectedImagesWithInfoAsync,
        updateNodeData,
    ]);

    return (
        <>
            <div
                className={`
          w-[220px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
          ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
        `}
            >
                {/* 输入端口 - prompt */}
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input-prompt"
                    style={{ top: "30%" }}
                    className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
                />
                <div
                    className="absolute -left-9 text-[10px] text-base-content/50"
                    style={{ top: "30%", transform: "translateY(-100%)" }}
                >
                    提示词
                </div>

                {/* 输入端口 - image */}
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input-image"
                    style={{ top: "70%" }}
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
                />
                <div
                    className="absolute -left-9 text-[10px] text-base-content/50"
                    style={{ top: "70%", transform: "translateY(-100%)" }}
                >
                    参考图
                </div>

                {/* 节点头部 */}
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">{data.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isPromptConnected && (
                            <div className="tooltip tooltip-left" data-tip="请连接提示词节点">
                                <CircleAlert className="w-4 h-4 text-white/80" />
                            </div>
                        )}
                        {isPromptConnected && hasEmptyImageInputs && (
                            <div className="tooltip tooltip-left" data-tip={`图片输入为空: ${emptyImageLabels.join(", ")}`}>
                                <AlertTriangle className="w-4 h-4 text-yellow-300" />
                            </div>
                        )}
                    </div>
                </div>

                {/* 节点内容 */}
                <div className="p-2 space-y-2 nodrag">
                    {/* 模型选择 */}
                    <ModelSelector
                        value={model}
                        options={presetModels}
                        onChange={handleModelChange}
                        variant="primary"
                        allowCustom={true}
                        modelCategory="imageGenerator"
                    />

                    {/* 尺寸选项 */}
                    <div>
                        <label className="text-xs text-base-content/60 mb-0.5 block">尺寸/比例</label>
                        <select
                            className="select select-bordered select-xs w-full"
                            value={sizeSelectValue}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                const value = e.target.value as GptImageSize | "custom";
                                if (value === "custom") {
                                    updateNodeData<GptImageGeneratorNodeData>(id, {
                                        sizeMode: "custom",
                                        customWidth: customDimensions.width,
                                        customHeight: customDimensions.height,
                                    });
                                    return;
                                }

                                updateNodeData<GptImageGeneratorNodeData>(id, {
                                    sizeMode: "preset",
                                    size: value,
                                });
                            }}
                        >
                            {sizePresetOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {sizeMode === "custom" && (
                            <div className="grid grid-cols-2 gap-1 mt-1">
                                <input
                                    type="number"
                                    min={16}
                                    max={3840}
                                    step={16}
                                    className="input input-bordered input-xs w-full"
                                    value={customDimensions.width}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        updateNodeData<GptImageGeneratorNodeData>(id, {
                                            customWidth: Number(e.target.value),
                                            sizeMode: "custom",
                                        });
                                    }}
                                />
                                <input
                                    type="number"
                                    min={16}
                                    max={3840}
                                    step={16}
                                    className="input input-bordered input-xs w-full"
                                    value={customDimensions.height}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        updateNodeData<GptImageGeneratorNodeData>(id, {
                                            customHeight: Number(e.target.value),
                                            sizeMode: "custom",
                                        });
                                    }}
                                />
                            </div>
                        )}
                        {sizeMode === "custom" && sizeValidationError && (
                            <div className="text-[10px] text-error mt-1">{sizeValidationError}</div>
                        )}
                    </div>

                    {/* 质量选项 */}
                    <div>
                        <label className="text-xs text-base-content/60 mb-0.5 block">质量</label>
                        <div className="grid grid-cols-4 gap-1">
                            {qualityOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`btn btn-xs px-0 ${(data.quality || "auto") === opt.value ? "btn-secondary" : "btn-ghost bg-base-200"}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateNodeData<GptImageGeneratorNodeData>(id, { quality: opt.value as GptImageGeneratorNodeData["quality"] });
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 背景选项 */}
                    <div>
                        <label className="text-xs text-base-content/60 mb-0.5 block">背景</label>
                        <div className="grid grid-cols-3 gap-1">
                            {backgroundOptionsForModel.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`btn btn-xs ${(data.background || "auto") === opt.value ? "btn-secondary" : "btn-ghost bg-base-200"}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateNodeData<GptImageGeneratorNodeData>(id, { background: opt.value as GptImageGeneratorNodeData["background"] });
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 输出格式与审核 */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <div>
                            <label className="text-xs text-base-content/60 mb-0.5 block">格式</label>
                            <select
                                className="select select-bordered select-xs w-full"
                                value={data.outputFormat || "png"}
                                onPointerDown={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    updateNodeData<GptImageGeneratorNodeData>(id, {
                                        outputFormat: e.target.value as GptImageGeneratorNodeData["outputFormat"],
                                    });
                                }}
                            >
                                {outputFormatOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-base-content/60 mb-0.5 block">审核</label>
                            <select
                                className="select select-bordered select-xs w-full"
                                value={data.moderation || "auto"}
                                onPointerDown={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    updateNodeData<GptImageGeneratorNodeData>(id, {
                                        moderation: e.target.value as GptImageGeneratorNodeData["moderation"],
                                    });
                                }}
                            >
                                {moderationOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 生成按钮 */}
                    <button
                        className={`btn btn-sm w-full gap-2 ${data.status === "loading" || !isPromptConnected ? "btn-disabled" : "btn-secondary"}`}
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

                    {/* 预览图 */}
                    {(data.outputImage || data.outputImagePath) && (
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => setShowPreview(true)}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="w-full h-[120px] overflow-hidden rounded-lg bg-base-200">
                                <img
                                    src={data.outputImagePath ? getImageUrl(data.outputImagePath) : `data:image/png;base64,${data.outputImage}`}
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

                {/* 输出端口 */}
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output-image"
                    className="!w-3 !h-3 !bg-lime-500 !border-2 !border-white"
                />
            </div>

            {/* 预览弹窗 */}
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

// 导出 GPT Image 节点
export const GptImageGeneratorNode = memo((props: NodeProps<GptImageGeneratorNode>) => {
    return <GptImageGeneratorBase {...props} />;
});
GptImageGeneratorNode.displayName = "GptImageGeneratorNode";
