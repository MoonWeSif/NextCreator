import { memo, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Video,
  Play,
  AlertCircle,
  Square,
  Download,
  CheckCircle2,
  Eye,
  X,
  Settings2,
  Link2Off,
  Loader2,
  AlertTriangle,
  CircleAlert,
  ImagePlus,
  Layers,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { downloadVideo, type VideoTaskStage } from "@/services/videoGeneration";
import { taskManager } from "@/services/taskManager";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import type { ErrorDetails } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  VeoAspectRatio,
  VeoDurationType,
  VeoReferenceImage,
} from "@/services/videoGeneration/providers/veo";

// Veo 节点数据类型
export interface VeoGeneratorNodeData {
  [key: string]: unknown;
  label: string;
  model: string;
  // Veo 特有参数
  aspectRatio?: VeoAspectRatio;
  durationSeconds?: number;
  negativePrompt?: string;
  personGeneration?: "allow_adult";
  // 生成模式：text2video | image2video | interpolation | reference
  generationMode?: "text2video" | "image2video" | "interpolation" | "reference";
  // 参考图片（仅标准版支持）
  referenceImages?: VeoReferenceImage[];
  // 状态
  status: "idle" | "loading" | "success" | "error";
  taskId?: string;
  taskStage?: VideoTaskStage;
  progress?: number;
  outputVideo?: string;
  error?: string;
  errorDetails?: ErrorDetails;
}

// 定义节点类型
type VeoGeneratorNode = Node<VeoGeneratorNodeData>;

// 预设模型选项
const presetModels: { value: string; label: string; fast?: boolean }[] = [
  { value: "veo-3.1-generate-preview", label: "Veo 3.1 标准版" },
  { value: "veo-3.1-fast-generate-preview", label: "Veo 3.1 快速版", fast: true },
];

// 生成模式选项
const generationModes: { value: string; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "text2video", label: "文生视频", icon: <Video className="w-4 h-4" />, description: "仅通过文字描述生成视频" },
  { value: "image2video", label: "图生视频", icon: <ImagePlus className="w-4 h-4" />, description: "单张图片作为首帧" },
  { value: "interpolation", label: "帧插值", icon: <Layers className="w-4 h-4" />, description: "首尾帧生成中间过渡" },
  { value: "reference", label: "参考图片", icon: <ImagePlus className="w-4 h-4" />, description: "参考图片风格生成" },
];

// 宽高比选项
const aspectRatioOptions: { value: VeoAspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 横版" },
  { value: "9:16", label: "9:16 竖版" },
];

// 时长选项
const durationOptions: { value: number; label: string }[] = [
  { value: 4, label: "4秒" },
  { value: 6, label: "6秒" },
  { value: 8, label: "8秒" },
];

// 任务阶段配置
const stageConfig: Record<VideoTaskStage, { label: string; color: string }> = {
  queued: { label: "排队中", color: "text-warning" },
  in_progress: { label: "生成中", color: "text-info" },
  completed: { label: "已完成", color: "text-success" },
  failed: { label: "失败", color: "text-error" },
};

export const VeoGeneratorNode = memo(({ id, data, selected }: NodeProps<VeoGeneratorNode>) => {
  const { updateNodeData, getConnectedInputData, getConnectedInputDataAsync, getEmptyConnectedInputs } = useFlowStore();
  const activeCanvasId = useCanvasStore((state) => state.activeCanvasId);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "ready">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [errorToShow, setErrorToShow] = useState<string | null>(null);

  // 省略号加载动画
  const dots = useLoadingDots(data.status === "loading" || previewState === "loading" || isDownloading);

  // 检测空输入连接
  const emptyInputs = getEmptyConnectedInputs(id);
  const hasEmptyImageInputs = emptyInputs.emptyImages.length > 0;

  // 当前模型和模式
  const currentModel = data.model || "veo-3.1-fast-generate-preview";
  const currentMode = data.generationMode || "text2video";
  const isFastModel = currentModel.includes("fast");

  // 获取显示的模型名称
  const getDisplayModelName = () => {
    const preset = presetModels.find((m) => m.value === currentModel);
    return preset ? preset.label : currentModel;
  };

  // 检测是否连接了提示词
  const { prompt: connectedPrompt } = getConnectedInputData(id);
  const isPromptConnected = !!connectedPrompt;

  // 清理函数 - 清理预览 URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 打开预览
  const handleOpenPreview = useCallback(async () => {
    if (!data.taskId || previewState === "loading") return;

    setPreviewState("loading");
    setPreviewError(null);

    // 获取供应商配置
    const { settings } = useSettingsStore.getState();
    const providerId = settings.nodeProviders.veoGenerator;
    const provider = settings.providers.find((p) => p.id === providerId);

    if (!provider) {
      setPreviewError("未配置供应商");
      setPreviewState("idle");
      return;
    }

    try {
      const result = await invoke<{ success: boolean; videoData?: string; error?: string }>("veo_get_content", {
        params: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          taskId: data.taskId,
        },
      });

      if (result.success && result.videoData) {
        // 将 base64 转换为 Blob URL
        const byteCharacters = atob(result.videoData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewState("ready");
      } else {
        setPreviewError(result.error || "加载视频失败");
        setPreviewState("idle");
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "加载视频失败");
      setPreviewState("idle");
    }
  }, [data.taskId, previewState]);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewState("idle");
    setPreviewError(null);
  }, [previewUrl]);

  // 生成视频
  const handleGenerate = useCallback(async () => {
    const { prompt, images } = await getConnectedInputDataAsync(id);

    if (!prompt) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    if (!activeCanvasId) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "画布未初始化",
        errorDetails: undefined,
      });
      return;
    }

    // 获取供应商配置
    const { settings } = useSettingsStore.getState();
    const providerId = settings.nodeProviders.veoGenerator;
    const provider = settings.providers.find((p) => p.id === providerId);

    if (!provider) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "请先在供应商管理中配置 Veo 视频生成节点的供应商",
        errorDetails: undefined,
      });
      return;
    }

    // 验证模式和图片数量
    const mode = data.generationMode || "text2video";
    if (mode === "image2video" && images.length < 1) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "图生视频模式需要连接至少1张图片",
        errorDetails: undefined,
      });
      return;
    }
    if (mode === "interpolation" && images.length < 2) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "帧插值模式需要连接2张图片（首帧和尾帧）",
        errorDetails: undefined,
      });
      return;
    }
    if (mode === "reference" && isFastModel) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: "参考图片功能仅标准版支持，请切换到 Veo 3.1 标准版",
        errorDetails: undefined,
      });
      return;
    }

    // 清理旧的预览
    handleClosePreview();

    // 重置状态
    updateNodeData<VeoGeneratorNodeData>(id, {
      status: "loading",
      error: undefined,
      progress: 0,
      taskId: undefined,
      taskStage: "queued",
    });

    try {
      // 构建请求参数
      interface VeoRequestParams {
        baseUrl: string;
        apiKey: string;
        model: string;
        prompt: string;
        images?: string[];
        metadata?: {
          aspectRatio?: string;
          durationSeconds?: number;
          negativePrompt?: string;
          personGeneration?: string;
          referenceImages?: VeoReferenceImage[];
        };
      }

      const params: VeoRequestParams = {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: currentModel,
        prompt,
      };

      // 根据模式添加图片
      if (mode === "image2video" && images.length >= 1) {
        params.images = [images[0]];
      } else if (mode === "interpolation" && images.length >= 2) {
        params.images = [images[0], images[1]];
      }

      // 添加 metadata
      params.metadata = {};
      if (data.aspectRatio) {
        params.metadata.aspectRatio = data.aspectRatio;
      }
      // 帧插值和参考图片模式时长必须为8
      if (mode === "interpolation" || mode === "reference") {
        params.metadata.durationSeconds = 8;
      } else if (data.durationSeconds) {
        params.metadata.durationSeconds = data.durationSeconds;
      }
      if (data.negativePrompt) {
        params.metadata.negativePrompt = data.negativePrompt;
      }
      if (data.personGeneration) {
        params.metadata.personGeneration = data.personGeneration;
      }
      // 参考图片模式
      if (mode === "reference" && images.length > 0) {
        params.metadata.referenceImages = images.slice(0, 3).map((img) => ({
          image: { bytesBase64Encoded: img },
          referenceType: "asset" as const,
        }));
      }

      // 调用后端创建任务
      const result = await invoke<{ success: boolean; taskId?: string; status?: string; progress?: number; error?: string }>("veo_create_task", {
        params,
      });

      if (!result.success || !result.taskId) {
        updateNodeData<VeoGeneratorNodeData>(id, {
          status: "error",
          error: result.error || "创建任务失败",
          taskStage: "failed",
        });
        return;
      }

      const taskId = result.taskId;

      // 更新节点的 taskId
      updateNodeData<VeoGeneratorNodeData>(id, {
        taskId,
        taskStage: "queued",
      });

      // 注册到全局任务管理器
      taskManager.registerVeoTask(taskId, id, activeCanvasId);

    } catch (error) {
      updateNodeData<VeoGeneratorNodeData>(id, {
        status: "error",
        error: error instanceof Error ? error.message : "生成失败",
        errorDetails: undefined,
        taskStage: "failed",
      });
    }
  }, [id, currentModel, data.aspectRatio, data.durationSeconds, data.negativePrompt, data.personGeneration, data.generationMode, activeCanvasId, updateNodeData, getConnectedInputDataAsync, handleClosePreview, isFastModel]);

  const handleStop = useCallback(() => {
    if (activeCanvasId) {
      taskManager.cancelTask(id, activeCanvasId);
    }
    updateNodeData<VeoGeneratorNodeData>(id, {
      status: "idle",
      error: undefined,
      progress: 0,
      taskStage: undefined,
    });
  }, [id, activeCanvasId, updateNodeData]);

  const handleDownload = useCallback(async () => {
    if (!data.taskId || isDownloading) return;
    setIsDownloading(true);

    try {
      // 获取供应商配置
      const { settings } = useSettingsStore.getState();
      const providerId = settings.nodeProviders.veoGenerator;
      const provider = settings.providers.find((p) => p.id === providerId);

      if (!provider) {
        console.error("[VeoNode] 未配置供应商");
        setIsDownloading(false);
        return;
      }

      // 直接调用 Veo 后端获取视频内容
      const result = await invoke<{ success: boolean; videoData?: string; error?: string }>("veo_get_content", {
        params: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          taskId: data.taskId,
        },
      });

      if (!result.success || !result.videoData) {
        console.error("[VeoNode] 下载失败:", result.error);
        setIsDownloading(false);
        return;
      }

      // 将 base64 转换为 Uint8Array
      const byteCharacters = atob(result.videoData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers);

      // 使用 Tauri 保存对话框
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        defaultPath: `veo-video-${Date.now()}.mp4`,
        filters: [{ name: "视频", extensions: ["mp4", "webm", "mov"] }],
      });

      if (filePath) {
        await writeFile(filePath, bytes);
      }
    } catch (error) {
      console.error("[VeoNode] 下载失败:", error);
    }

    setIsDownloading(false);
  }, [data.taskId, isDownloading]);

  // 获取当前阶段配置
  const currentStage = data.taskStage ? stageConfig[data.taskStage] : null;

  // 节点样式配置
  const headerGradient = "bg-gradient-to-r from-purple-500 to-pink-500";
  const outputHandleColor = "!bg-purple-500";

  // 获取模式标签
  const getModeLabel = () => {
    const mode = generationModes.find((m) => m.value === currentMode);
    return mode?.label || "文生视频";
  };

  // 获取状态显示
  const getStatusDisplay = () => {
    if (data.status === "loading" && currentStage) {
      if (data.taskStage === "in_progress") {
        return <span className="text-info">生成中{dots} {data.progress || 0}%</span>;
      }
      return <span className={currentStage.color}>{currentStage.label}</span>;
    }
    if (data.status === "success") {
      return <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />已完成</span>;
    }
    if (data.status === "error") {
      return <span className="text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" />失败</span>;
    }
    if (!isPromptConnected) {
      return <span className="text-base-content/40 flex items-center gap-1"><Link2Off className="w-3 h-3" />待连接</span>;
    }
    return <span className="text-success/70">就绪</span>;
  };

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
          className="absolute -left-9 text-[10px] text-base-content/50 tooltip tooltip-left"
          style={{ top: "30%", transform: "translateY(-100%)" }}
          data-tip="文本提示词"
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
          图片
        </div>

        {/* 节点头部 */}
        <div className={`flex items-center justify-between px-3 py-2 ${headerGradient} rounded-t-lg`}>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-white" />
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
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white uppercase">
              {isFastModel ? "FAST" : "STD"}
            </span>
          </div>
        </div>

        {/* 节点内容 */}
        <div className="p-2 space-y-2 nodrag">
          {/* 模型和模式显示 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">模型</span>
            <span className="font-medium">{getDisplayModelName()}</span>
          </div>

          {/* 配置摘要 */}
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>{getModeLabel()} · {data.aspectRatio || "16:9"} · {data.durationSeconds || 8}秒</span>
            <button
              className="btn btn-ghost btn-xs px-1"
              onClick={() => setIsDetailModalOpen(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 状态显示 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">状态：</span>
            {getStatusDisplay()}
          </div>

          {/* 错误信息 */}
          {data.status === "error" && data.error && (
            <div
              className="flex items-start gap-1 text-error text-xs bg-error/10 p-2 rounded cursor-pointer hover:bg-error/20 transition-colors"
              onClick={() => {
                setErrorToShow(data.error!);
                setShowErrorDetail(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-3 break-all">{data.error}</span>
            </div>
          )}

          {/* 预览加载错误 */}
          {previewError && (
            <div
              className="flex items-start gap-1 text-error text-xs bg-error/10 p-2 rounded cursor-pointer hover:bg-error/20 transition-colors"
              onClick={() => {
                setErrorToShow(previewError);
                setShowErrorDetail(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-3 break-all">{previewError}</span>
            </div>
          )}

          {/* 操作按钮 */}
          {data.status === "loading" ? (
            <button
              className="btn btn-sm btn-error w-full gap-2"
              onClick={handleStop}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Square className="w-4 h-4" />
              停止
            </button>
          ) : data.status === "success" ? (
            <div className="flex gap-2">
              <button
                className={`btn btn-xs btn-outline flex-1 gap-1 ${previewState === "loading" ? "btn-disabled" : ""}`}
                onClick={handleOpenPreview}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={previewState === "loading"}
              >
                {previewState === "loading" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    预览
                  </>
                )}
              </button>
              <button
                className={`btn btn-xs btn-outline flex-1 gap-1 ${isDownloading ? "btn-disabled" : ""}`}
                onClick={handleDownload}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    下载
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              className={`btn btn-sm w-full gap-2 ${!isPromptConnected ? "btn-disabled" : "btn-primary"}`}
              onClick={handleGenerate}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!isPromptConnected}
            >
              {!isPromptConnected ? (
                <span className="text-base-content/50">待连接提示词</span>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  生成视频
                </>
              )}
            </button>
          )}
        </div>

        {/* 输出端口 */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-video"
          className={`!w-3 !h-3 ${outputHandleColor} !border-2 !border-white`}
        />
      </div>

      {/* 详情配置弹窗 */}
      {isDetailModalOpen && (
        <VeoDetailModal
          data={data}
          nodeId={id}
          onClose={() => setIsDetailModalOpen(false)}
          onUpdateData={(updates) => updateNodeData<VeoGeneratorNodeData>(id, updates)}
        />
      )}

      {/* 预览弹窗 */}
      {previewState === "ready" && previewUrl && (
        <VeoPreviewModal
          videoUrl={previewUrl}
          taskId={data.taskId}
          onClose={handleClosePreview}
        />
      )}

      {/* 错误详情弹窗 */}
      {showErrorDetail && errorToShow && (
        <ErrorDetailModal
          error={errorToShow}
          errorDetails={data.errorDetails}
          title="执行错误"
          onClose={() => {
            setShowErrorDetail(false);
            setErrorToShow(null);
          }}
        />
      )}
    </>
  );
});

VeoGeneratorNode.displayName = "VeoGeneratorNode";

// Veo 详情配置弹窗
interface VeoDetailModalProps {
  data: VeoGeneratorNodeData;
  nodeId: string;
  onClose: () => void;
  onUpdateData: (updates: Partial<VeoGeneratorNodeData>) => void;
}

function VeoDetailModal({ data, onClose, onUpdateData }: VeoDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const currentModel = data.model || "veo-3.1-fast-generate-preview";
  const currentMode = data.generationMode || "text2video";
  const isFastModel = currentModel.includes("fast");

  // 检查是否是自定义模型
  const isCustomModel = !presetModels.some((m) => m.value === currentModel);

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    if (customModel.trim()) {
      onUpdateData({ model: customModel.trim() });
      setCustomModel("");
    }
  };

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 关闭时播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // 获取当前阶段配置
  const currentStage = data.taskStage ? stageConfig[data.taskStage] : null;

  // 获取可用的时长选项（帧插值和参考图片模式只能选8秒）
  const getAvailableDurations = () => {
    if (currentMode === "interpolation" || currentMode === "reference") {
      return [{ value: 8, label: "8秒（必选）" }];
    }
    return durationOptions;
  };

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center p-4
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/60" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          w-full max-w-md bg-base-100 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-white" />
            <span className="text-base font-medium text-white">Veo 视频生成设置</span>
          </div>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* 模型选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">模型</label>
            <div className="flex gap-2">
              {presetModels.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${currentModel === opt.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => {
                    // 如果切换到快速版且当前是参考图片模式，则切换到文生视频
                    const newMode = opt.fast && currentMode === "reference" ? "text2video" : currentMode;
                    onUpdateData({ model: opt.value, generationMode: newMode });
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isCustomModel && (
              <div className="mt-2 px-2 py-1.5 bg-primary/10 rounded-lg text-xs text-primary">
                当前使用自定义模型: {currentModel}
              </div>
            )}
            <div className="mt-3">
              <label className="text-xs text-base-content/60 mb-1 block">自定义模型</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-sm input-bordered flex-1"
                  placeholder="输入模型名称..."
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomModelSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleCustomModelSubmit}
                  disabled={!customModel.trim()}
                >
                  确定
                </button>
              </div>
            </div>
          </div>

          {/* 生成模式选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">生成模式</label>
            <div className="grid grid-cols-2 gap-2">
              {generationModes.map((mode) => {
                // 快速版不支持参考图片
                const disabled = mode.value === "reference" && isFastModel;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    disabled={disabled}
                    className={`
                      btn btn-sm justify-start gap-2
                      ${currentMode === mode.value ? "btn-primary" : "btn-ghost bg-base-200"}
                      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    onClick={() => {
                      if (!disabled) {
                        // 切换模式时自动调整时长
                        const newDuration = (mode.value === "interpolation" || mode.value === "reference") ? 8 : data.durationSeconds;
                        onUpdateData({ generationMode: mode.value as VeoGeneratorNodeData["generationMode"], durationSeconds: newDuration });
                      }
                    }}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-base-content/60">
              {generationModes.find((m) => m.value === currentMode)?.description}
            </div>
            {currentMode === "reference" && (
              <div className="mt-2 text-xs text-warning bg-warning/10 p-2 rounded">
                参考图片功能仅标准版支持，将图片连接到图片输入端口（最多3张）
              </div>
            )}
          </div>

          {/* 宽高比选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">宽高比</label>
            <div className="flex gap-2">
              {aspectRatioOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${(data.aspectRatio || "16:9") === opt.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ aspectRatio: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 时长选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">视频时长</label>
            <div className="flex gap-2">
              {getAvailableDurations().map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${(data.durationSeconds || 8) === opt.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ durationSeconds: opt.value as VeoDurationType extends string ? number : never })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(currentMode === "interpolation" || currentMode === "reference") && (
              <div className="mt-1 text-xs text-base-content/50">
                帧插值和参考图片模式固定为8秒
              </div>
            )}
          </div>

          {/* 负面提示词 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">负面提示词</label>
            <textarea
              className="textarea textarea-bordered w-full text-sm"
              placeholder="描述不想要的元素，例如：模糊，低质量，变形"
              rows={2}
              value={data.negativePrompt || ""}
              onChange={(e) => onUpdateData({ negativePrompt: e.target.value })}
            />
          </div>

          {/* 人物生成 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">人物生成</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`
                  btn btn-sm flex-1
                  ${!data.personGeneration ? "btn-primary" : "btn-ghost bg-base-200"}
                `}
                onClick={() => onUpdateData({ personGeneration: undefined })}
              >
                默认
              </button>
              <button
                type="button"
                className={`
                  btn btn-sm flex-1
                  ${data.personGeneration === "allow_adult" ? "btn-primary" : "btn-ghost bg-base-200"}
                `}
                onClick={() => onUpdateData({ personGeneration: "allow_adult" })}
              >
                允许成人
              </button>
            </div>
          </div>

          {/* 任务状态详情 */}
          {(data.status === "loading" || data.status === "success" || data.status === "error") && (
            <div className="border-t border-base-300 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-base-content">任务状态</h4>

              {data.taskId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content/60">任务ID</span>
                  <span className="text-base-content font-mono truncate max-w-[200px]">{data.taskId}</span>
                </div>
              )}

              {currentStage && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content/60">状态</span>
                  <span className={currentStage.color}>{currentStage.label}</span>
                </div>
              )}

              {data.status === "loading" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-base-content/60">
                    <span>进度</span>
                    <span>{data.progress || 0}%</span>
                  </div>
                  <progress
                    className={`progress w-full h-2 ${
                      data.taskStage === "queued" ? "progress-warning" : "progress-primary"
                    }`}
                    value={data.progress || 0}
                    max="100"
                  />
                </div>
              )}

              {data.status === "error" && data.error && (
                <div className="flex items-start gap-2 text-error text-xs bg-error/10 p-2 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{data.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end px-4 py-3 bg-base-200/50 border-t border-base-300">
          <span className="text-xs text-base-content/50 mr-auto">
            按 ESC 关闭
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 视频预览弹窗组件
interface VeoPreviewModalProps {
  videoUrl: string;
  taskId?: string;
  onClose: () => void;
}

function VeoPreviewModal({ videoUrl, taskId, onClose }: VeoPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const handleDownload = useCallback(async () => {
    if (!taskId || isDownloading) return;

    setIsDownloading(true);

    try {
      // 获取供应商配置
      const { settings } = useSettingsStore.getState();
      const providerId = settings.nodeProviders.veoGenerator;
      const provider = settings.providers.find((p) => p.id === providerId);

      if (!provider) {
        console.error("[VeoPreview] 未配置供应商");
        setIsDownloading(false);
        return;
      }

      // 直接调用 Veo 后端获取视频内容
      const result = await invoke<{ success: boolean; videoData?: string; error?: string }>("veo_get_content", {
        params: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          taskId,
        },
      });

      if (!result.success || !result.videoData) {
        console.error("[VeoPreview] 下载失败:", result.error);
        setIsDownloading(false);
        return;
      }

      // 将 base64 转换为 Uint8Array
      const byteCharacters = atob(result.videoData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers);

      // 使用 Tauri 保存对话框
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        defaultPath: `veo-video-${Date.now()}.mp4`,
        filters: [{ name: "视频", extensions: ["mp4", "webm", "mov"] }],
      });

      if (filePath) {
        await writeFile(filePath, bytes);
      }
    } catch (error) {
      console.error("[VeoPreview] 下载失败:", error);
    }

    setIsDownloading(false);
  }, [taskId, isDownloading]);

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/80" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          relative max-w-4xl max-h-[90vh] p-4
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={videoUrl}
          className="max-w-full max-h-[80vh] rounded-lg"
          controls
          autoPlay
        />
        <div className="flex justify-center gap-2 mt-4">
          <button
            className={`btn btn-sm btn-primary gap-2 ${isDownloading ? "btn-disabled" : ""}`}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                下载中
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                下载视频
              </>
            )}
          </button>
          <button className="btn btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
        <p
          className={`
            text-center text-xs text-white/50 mt-2
            transition-all duration-200 ease-out
            ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}
          `}
        >
          点击背景、按 ESC 或关闭按钮关闭窗口
        </p>
      </div>
    </div>,
    document.body
  );
}
