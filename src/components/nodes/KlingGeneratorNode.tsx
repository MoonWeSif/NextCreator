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
  Trash2,
  Check,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import type { VideoTaskStage } from "@/services/videoGeneration";
import { taskManager } from "@/services/taskManager";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { useCustomModelStore } from "@/stores/customModelStore";
import type { ErrorDetails } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import type { KlingMode } from "@/services/videoGeneration/providers/kling";

// Kling 节点数据类型
export interface KlingGeneratorNodeData {
  [key: string]: unknown;
  label: string;
  model: string;
  // Kling 特有参数
  mode: KlingMode;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  negativePrompt?: string;
  style?: string;
  qualityLevel?: string;
  // 状态
  status: "idle" | "loading" | "success" | "error";
  taskId?: string;
  taskStage?: VideoTaskStage;
  progress?: number;
  outputVideo?: string;
  videoUrl?: string;  // Kling 返回的视频 URL
  error?: string;
  errorDetails?: ErrorDetails;
}

// 定义节点类型
type KlingGeneratorNode = Node<KlingGeneratorNodeData>;

// 预设模型选项
const presetModels: { value: string; label: string }[] = [
  { value: "kling-v1", label: "Kling V1" },
  { value: "kling-v1-5", label: "Kling V1.5" },
];

// 生成模式选项
const generationModes: { value: KlingMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "text2video", label: "文生视频", icon: <Video className="w-4 h-4" />, description: "通过文字描述生成视频" },
  { value: "image2video", label: "图生视频", icon: <ImagePlus className="w-4 h-4" />, description: "基于图片生成视频" },
];

// 视频尺寸选项
const sizeOptions: { width: number; height: number; label: string }[] = [
  { width: 1280, height: 720, label: "720p 横屏" },
  { width: 720, height: 1280, label: "720p 竖屏" },
  { width: 1920, height: 1080, label: "1080p 横屏" },
  { width: 1080, height: 1920, label: "1080p 竖屏" },
  { width: 1024, height: 1024, label: "1:1 方形" },
];

// 时长选项
const durationOptions: { value: number; label: string }[] = [
  { value: 5, label: "5秒" },
  { value: 10, label: "10秒" },
];

// 任务阶段配置
const stageConfig: Record<VideoTaskStage, { label: string; color: string }> = {
  queued: { label: "排队中", color: "text-warning" },
  in_progress: { label: "生成中", color: "text-info" },
  completed: { label: "已完成", color: "text-success" },
  failed: { label: "失败", color: "text-error" },
};

export const KlingGeneratorNode = memo(({ id, data, selected }: NodeProps<KlingGeneratorNode>) => {
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
  const currentModel = data.model || "kling-v1";
  const currentMode = data.mode || "text2video";

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
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 打开预览（Kling 返回的是视频 URL，可以直接预览）
  const handleOpenPreview = useCallback(async () => {
    if (!data.videoUrl && !data.taskId) return;

    // 如果已经有视频 URL，直接使用
    if (data.videoUrl) {
      setPreviewUrl(data.videoUrl);
      setPreviewState("ready");
      return;
    }

    // 否则从 API 获取
    if (!data.taskId || previewState === "loading") return;

    setPreviewState("loading");
    setPreviewError(null);

    // 获取供应商配置
    const { settings } = useSettingsStore.getState();
    const providerId = settings.nodeProviders.klingGenerator;
    const provider = settings.providers.find((p) => p.id === providerId);

    if (!provider) {
      setPreviewError("未配置供应商");
      setPreviewState("idle");
      return;
    }

    try {
      const result = await invoke<{ success: boolean; videoUrl?: string; error?: string }>("kling_get_content", {
        params: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          taskId: data.taskId,
          mode: data.mode || "text2video",
        },
      });

      if (result.success && result.videoUrl) {
        setPreviewUrl(result.videoUrl);
        setPreviewState("ready");
        // 保存 URL 到节点数据
        updateNodeData<KlingGeneratorNodeData>(id, { videoUrl: result.videoUrl });
      } else {
        setPreviewError(result.error || "加载视频失败");
        setPreviewState("idle");
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "加载视频失败");
      setPreviewState("idle");
    }
  }, [id, data.taskId, data.videoUrl, data.mode, previewState, updateNodeData]);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
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
      updateNodeData<KlingGeneratorNodeData>(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    if (!activeCanvasId) {
      updateNodeData<KlingGeneratorNodeData>(id, {
        status: "error",
        error: "画布未初始化",
        errorDetails: undefined,
      });
      return;
    }

    // 获取供应商配置
    const { settings } = useSettingsStore.getState();
    const providerId = settings.nodeProviders.klingGenerator;
    const provider = settings.providers.find((p) => p.id === providerId);

    if (!provider) {
      updateNodeData<KlingGeneratorNodeData>(id, {
        status: "error",
        error: "请先在供应商管理中配置 Kling 视频生成节点的供应商",
        errorDetails: undefined,
      });
      return;
    }

    // 验证模式和图片
    const mode = data.mode || "text2video";
    if (mode === "image2video" && images.length < 1) {
      updateNodeData<KlingGeneratorNodeData>(id, {
        status: "error",
        error: "图生视频模式需要连接至少1张图片",
        errorDetails: undefined,
      });
      return;
    }

    // 清理旧的预览
    handleClosePreview();

    // 重置状态
    updateNodeData<KlingGeneratorNodeData>(id, {
      status: "loading",
      error: undefined,
      progress: 0,
      taskId: undefined,
      taskStage: "queued",
      videoUrl: undefined,
    });

    try {
      // 构建请求参数
      interface KlingRequestParams {
        baseUrl: string;
        apiKey: string;
        model: string;
        prompt: string;
        mode: string;
        image?: string;
        duration?: number;
        width?: number;
        height?: number;
        fps?: number;
        seed?: number;
        metadata?: {
          negative_prompt?: string;
          style?: string;
          quality_level?: string;
        };
      }

      const params: KlingRequestParams = {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: currentModel,
        prompt,
        mode,
      };

      // 添加图片（图生视频模式）
      if (mode === "image2video" && images.length >= 1) {
        params.image = images[0];
      }

      // 添加可选参数
      if (data.duration) {
        params.duration = data.duration;
      }
      if (data.width) {
        params.width = data.width;
      }
      if (data.height) {
        params.height = data.height;
      }
      if (data.fps) {
        params.fps = data.fps;
      }
      if (data.seed) {
        params.seed = data.seed;
      }

      // 添加 metadata
      if (data.negativePrompt || data.style || data.qualityLevel) {
        params.metadata = {};
        if (data.negativePrompt) {
          params.metadata.negative_prompt = data.negativePrompt;
        }
        if (data.style) {
          params.metadata.style = data.style;
        }
        if (data.qualityLevel) {
          params.metadata.quality_level = data.qualityLevel;
        }
      }

      // 调用后端创建任务
      const result = await invoke<{ success: boolean; taskId?: string; status?: string; error?: string }>("kling_create_task", {
        params,
      });

      if (!result.success || !result.taskId) {
        updateNodeData<KlingGeneratorNodeData>(id, {
          status: "error",
          error: result.error || "创建任务失败",
          taskStage: "failed",
        });
        return;
      }

      const taskId = result.taskId;

      // 更新节点的 taskId
      updateNodeData<KlingGeneratorNodeData>(id, {
        taskId,
        taskStage: "queued",
      });

      // 注册到全局任务管理器
      taskManager.registerKlingTask(taskId, id, activeCanvasId, mode);

    } catch (error) {
      updateNodeData<KlingGeneratorNodeData>(id, {
        status: "error",
        error: error instanceof Error ? error.message : "生成失败",
        errorDetails: undefined,
        taskStage: "failed",
      });
    }
  }, [id, currentModel, data.mode, data.duration, data.width, data.height, data.fps, data.seed, data.negativePrompt, data.style, data.qualityLevel, activeCanvasId, updateNodeData, getConnectedInputDataAsync, handleClosePreview]);

  const handleStop = useCallback(() => {
    if (activeCanvasId) {
      taskManager.cancelTask(id, activeCanvasId);
    }
    updateNodeData<KlingGeneratorNodeData>(id, {
      status: "idle",
      error: undefined,
      progress: 0,
      taskStage: undefined,
    });
  }, [id, activeCanvasId, updateNodeData]);

  const handleDownload = useCallback(async () => {
    const videoUrlToDownload = data.videoUrl || previewUrl;
    if (!videoUrlToDownload || isDownloading) return;
    setIsDownloading(true);

    try {
      // 从 URL 下载视频
      const result = await invoke<{ success: boolean; videoData?: string; error?: string }>("kling_download_video", {
        params: {
          videoUrl: videoUrlToDownload,
        },
      });

      if (!result.success || !result.videoData) {
        console.error("[KlingNode] 下载失败:", result.error);
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
        defaultPath: `kling-video-${Date.now()}.mp4`,
        filters: [{ name: "视频", extensions: ["mp4", "webm", "mov"] }],
      });

      if (filePath) {
        await writeFile(filePath, bytes);
      }
    } catch (error) {
      console.error("[KlingNode] 下载失败:", error);
    }

    setIsDownloading(false);
  }, [data.videoUrl, previewUrl, isDownloading]);

  // 获取当前阶段配置
  const currentStage = data.taskStage ? stageConfig[data.taskStage] : null;

  // 节点样式配置
  const headerGradient = "bg-gradient-to-r from-cyan-500 to-blue-500";
  const outputHandleColor = "!bg-cyan-500";

  // 获取模式标签
  const getModeLabel = () => {
    const mode = generationModes.find((m) => m.value === currentMode);
    return mode?.label || "文生视频";
  };

  // 获取尺寸标签
  const getSizeLabel = () => {
    if (data.width && data.height) {
      const preset = sizeOptions.find((s) => s.width === data.width && s.height === data.height);
      return preset ? preset.label : `${data.width}x${data.height}`;
    }
    return "720p";
  };

  // 获取状态显示
  const getStatusDisplay = () => {
    if (data.status === "loading" && currentStage) {
      if (data.taskStage === "in_progress") {
        return <span className="text-info">生成中{dots}</span>;
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
            {isPromptConnected && hasEmptyImageInputs && currentMode === "image2video" && (
              <div className="tooltip tooltip-left" data-tip={`图片输入为空: ${emptyInputs.emptyImages.map(i => i.label).join(", ")}`}>
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
              </div>
            )}
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white uppercase">
              KLING
            </span>
          </div>
        </div>

        {/* 节点内容 */}
        <div className="p-2 space-y-2 nodrag">
          {/* 模型显示 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">模型</span>
            <span className="font-medium">{getDisplayModelName()}</span>
          </div>

          {/* 配置摘要 */}
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>{getModeLabel()} · {getSizeLabel()} · {data.duration || 5}秒</span>
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
        <KlingDetailModal
          data={data}
          nodeId={id}
          onClose={() => setIsDetailModalOpen(false)}
          onUpdateData={(updates) => updateNodeData<KlingGeneratorNodeData>(id, updates)}
        />
      )}

      {/* 预览弹窗 */}
      {previewState === "ready" && previewUrl && (
        <KlingPreviewModal
          videoUrl={previewUrl}
          onClose={handleClosePreview}
          onDownload={handleDownload}
          isDownloading={isDownloading}
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

KlingGeneratorNode.displayName = "KlingGeneratorNode";

// Kling 详情配置弹窗
interface KlingDetailModalProps {
  data: KlingGeneratorNodeData;
  nodeId: string;
  onClose: () => void;
  onUpdateData: (updates: Partial<KlingGeneratorNodeData>) => void;
}

function KlingDetailModal({ data, onClose, onUpdateData }: KlingDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const { addCustomModel, removeCustomModel, getCustomModels } = useCustomModelStore();
  const customModels = getCustomModels("videoGenerator");

  const currentModel = data.model || "kling-v1";
  const currentMode = data.mode || "text2video";

  // 检查是否是自定义模型（不在预设列表和用户自定义列表中）
  const isCustomModel = !presetModels.some((m) => m.value === currentModel) && !customModels.includes(currentModel);

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (trimmed) {
      addCustomModel("videoGenerator", trimmed);
      onUpdateData({ model: trimmed });
      setCustomModel("");
    }
  };

  // 删除用户自定义模型
  const handleRemoveCustomModel = (model: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomModel("videoGenerator", model);
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

  // 获取当前选中的尺寸
  const currentSize = sizeOptions.find(
    (s) => s.width === (data.width || 1280) && s.height === (data.height || 720)
  ) || sizeOptions[0];

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
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-white" />
            <span className="text-base font-medium text-white">Kling 视频生成设置</span>
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
            <label className="text-sm font-medium text-base-content mb-2 block">预设模型</label>
            <div className="flex gap-2">
              {presetModels.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${currentModel === opt.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ model: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 用户自定义模型列表 */}
            {customModels.length > 0 && (
              <div className="mt-3">
                <label className="text-xs text-base-content/60 mb-1.5 block">我的模型</label>
                <div className="space-y-1">
                  {customModels.map((model) => (
                    <div
                      key={model}
                      className={`
                        w-full px-3 py-2 text-left text-sm rounded-lg
                        flex items-center justify-between group cursor-pointer
                        transition-colors
                        ${currentModel === model
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-base-200 hover:bg-base-300"
                        }
                      `}
                      onClick={() => onUpdateData({ model })}
                    >
                      <span className="truncate">{model}</span>
                      <div className="flex items-center gap-1">
                        {currentModel === model && <Check className="w-4 h-4" />}
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-error/20 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleRemoveCustomModel(model, e)}
                          title="删除此模型"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 当前自定义模型显示（如果是临时输入的，不在列表中） */}
            {isCustomModel && (
              <div className="mt-2 px-2 py-1.5 bg-primary/10 rounded-lg text-xs text-primary">
                当前使用自定义模型: {currentModel}
              </div>
            )}
            <div className="mt-3">
              <label className="text-xs text-base-content/60 mb-1 block">添加自定义模型</label>
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
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* 生成模式选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">生成模式</label>
            <div className="grid grid-cols-2 gap-2">
              {generationModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`
                    btn btn-sm justify-start gap-2
                    ${currentMode === mode.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ mode: mode.value })}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-base-content/60">
              {generationModes.find((m) => m.value === currentMode)?.description}
            </div>
          </div>

          {/* 视频尺寸选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">视频尺寸</label>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={`${opt.width}x${opt.height}`}
                  type="button"
                  className={`
                    btn btn-sm
                    ${currentSize.width === opt.width && currentSize.height === opt.height ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ width: opt.width, height: opt.height })}
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
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${(data.duration || 5) === opt.value ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ duration: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 帧率设置 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">帧率 (FPS)</label>
            <div className="flex gap-2">
              {[24, 30, 60].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${(data.fps || 30) === fps ? "btn-primary" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ fps })}
                >
                  {fps}
                </button>
              ))}
            </div>
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

          {/* 随机种子 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">随机种子</label>
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="留空则随机生成"
              value={data.seed || ""}
              onChange={(e) => {
                const value = e.target.value;
                onUpdateData({ seed: value ? parseInt(value, 10) : undefined });
              }}
            />
            <div className="mt-1 text-xs text-base-content/50">
              相同的种子和提示词可以生成相似的视频
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
interface KlingPreviewModalProps {
  videoUrl: string;
  onClose: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

function KlingPreviewModal({ videoUrl, onClose, onDownload, isDownloading }: KlingPreviewModalProps) {
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
            onClick={onDownload}
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
