import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Flame, Play, AlertCircle, Maximize2, AlertTriangle, CircleAlert } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { generateImage } from "@/services/imageGeneration";
import { saveImage, getImageUrl, type InputImageInfo } from "@/services/fileStorageService";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import type { ImageInputNodeData, ModelType, ErrorDetails } from "@/types";

// 豆包节点数据类型
interface DoubaoGeneratorNodeData {
    [key: string]: unknown;
    label: string;
    model: ModelType;
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    guidanceScale: number; // 提示词相关度 1-10
    watermark: boolean;
    status: "idle" | "loading" | "success" | "error";
    outputImage?: string;
    outputImagePath?: string;
    error?: string;
    errorDetails?: ErrorDetails;
}

type DoubaoGeneratorNode = Node<DoubaoGeneratorNodeData>;

// 预设模型选项
const presetModels = [
    { value: "doubao-seedream-3-0-t2i-250415", label: "豆包 SeedDream 3.0" },
    { value: "doubao-seedream-2-0-t2i", label: "豆包 SeedDream 2.0" },
];

// 宽高比选项
const aspectRatioOptions = [
    { value: "1:1", label: "1:1" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
];

// 豆包节点组件
function DoubaoGeneratorBase({
    id,
    data,
    selected,
}: NodeProps<DoubaoGeneratorNode>) {
    const { updateNodeData, getConnectedInputData, getConnectedInputDataAsync, getEmptyConnectedInputs, getConnectedImagesWithInfo } = useFlowStore();
    const [showPreview, setShowPreview] = useState(false);
    const [showErrorDetail, setShowErrorDetail] = useState(false);

    // 省略号加载动画
    const dots = useLoadingDots(data.status === "loading");

    // 检测空输入连接
    const emptyInputs = getEmptyConnectedInputs(id);
    const hasEmptyImageInputs = emptyInputs.emptyImages.length > 0;

    // 检测是否连接了提示词
    const { prompt } = getConnectedInputData(id);
    const isPromptConnected = prompt !== undefined;

    // 保存生成时的画布 ID
    const canvasIdRef = useRef<string | null>(null);

    // 默认模型
    const defaultModel: ModelType = "doubao-seedream-3-0-t2i-250415";
    const model: ModelType = data.model || defaultModel;

    // 默认提示词相关度
    const guidanceScale = data.guidanceScale ?? 5;
    const watermark = data.watermark ?? false;

    // 处理模型变更
    const handleModelChange = (value: string) => {
        updateNodeData<DoubaoGeneratorNodeData>(id, { model: value });
    };

    // 更新节点数据，同时更新 canvasStore
    const updateNodeDataWithCanvas = useCallback((nodeId: string, nodeData: Partial<DoubaoGeneratorNodeData>) => {
        const { activeCanvasId } = useCanvasStore.getState();
        const targetCanvasId = canvasIdRef.current;

        updateNodeData<DoubaoGeneratorNodeData>(nodeId, nodeData);

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
        const { prompt, images } = await getConnectedInputDataAsync(id);
        const { activeCanvasId } = useCanvasStore.getState();
        canvasIdRef.current = activeCanvasId;

        if (!prompt) {
            updateNodeDataWithCanvas(id, { status: "error", error: "请连接提示词节点", errorDetails: undefined });
            return;
        }

        updateNodeDataWithCanvas(id, { status: "loading", error: undefined });

        try {
            const response = await generateImage({
                prompt,
                model,
                inputImages: images.length > 0 ? images : undefined,
                aspectRatio: data.aspectRatio,
                guidanceScale,
            }, "doubaoGenerator");

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
    }, [id, model, data.aspectRatio, guidanceScale, updateNodeDataWithCanvas, getConnectedInputDataAsync, getConnectedImagesWithInfo, updateNodeData]);

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
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">{data.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isPromptConnected && (
                            <div className="tooltip tooltip-left" data-tip="请连接提示词节点">
                                <CircleAlert className="w-4 h-4 text-white/80" />
                            </div>
                        )}
                        {isPromptConnected && hasEmptyImageInputs && (
                            <div className="tooltip tooltip-left" data-tip={`图片输入为空: ${emptyInputs.emptyImages.map(i => i.label).join(", ")}`}>
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

                    {/* 宽高比选项 */}
                    <div>
                        <label className="text-xs text-base-content/60 mb-0.5 block">宽高比</label>
                        <div className="grid grid-cols-5 gap-1">
                            {aspectRatioOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`btn btn-xs ${(data.aspectRatio || "1:1") === opt.value ? "btn-secondary" : "btn-ghost bg-base-200"}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateNodeData<DoubaoGeneratorNodeData>(id, { aspectRatio: opt.value as DoubaoGeneratorNodeData["aspectRatio"] });
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 提示词相关度 */}
                    <div>
                        <label className="text-xs text-base-content/60 mb-0.5 block">
                            提示词相关度: {guidanceScale}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={guidanceScale}
                            className="range range-xs range-primary"
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                updateNodeData<DoubaoGeneratorNodeData>(id, { guidanceScale: parseInt(e.target.value) });
                            }}
                        />
                    </div>

                    {/* 水印开关 */}
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-base-content/60">水印</label>
                        <input
                            type="checkbox"
                            className="toggle toggle-xs toggle-primary"
                            checked={watermark}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                updateNodeData<DoubaoGeneratorNodeData>(id, { watermark: e.target.checked });
                            }}
                        />
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
                    className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
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

// 导出豆包节点
export const DoubaoGeneratorNode = memo((props: NodeProps<DoubaoGeneratorNode>) => {
    return <DoubaoGeneratorBase {...props} />;
});
DoubaoGeneratorNode.displayName = "DoubaoGeneratorNode";
