import { memo, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Video, Play, AlertCircle, Square, Download, CheckCircle2, Eye, X, Settings2, Link2Off, Loader2, AlertTriangle, CircleAlert, Trash2, Check } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { createVideoTask, getVideoContentBlobUrl, downloadVideo, type VideoTaskStage } from "@/services/videoGeneration";
import { taskManager } from "@/services/taskManager";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { useCustomModelStore } from "@/stores/customModelStore";
import type { VideoGeneratorNodeData, VideoModelType, VideoSizeType } from "@/types";

// 定义节点类型
type VideoGeneratorNode = Node<VideoGeneratorNodeData>;

// 预设模型选项
const presetModels: { value: string; label: string }[] = [
  { value: "sora-2", label: "Sora 2" },
  { value: "sora-2-pro", label: "Sora 2 Pro" },
];

// 兼容性：保留原有的 modelOptions 用于弹窗
const modelOptions: { value: VideoModelType; label: string }[] = [
  { value: "sora-2", label: "Sora 2" },
  { value: "sora-2-pro", label: "Sora 2 Pro" },
];

// 根据模型获取可用的秒数选项
function getSecondsOptions(model: VideoModelType) {
  if (model === "sora-2-pro") {
    return [
      { value: "10", label: "10秒" },
      { value: "15", label: "15秒" },
      { value: "25", label: "25秒" },
    ];
  }
  // sora-2
  return [
    { value: "10", label: "10秒" },
    { value: "15", label: "15秒" },
  ];
}

// 尺寸选项
const sizeOptions: { value: VideoSizeType; label: string }[] = [
  { value: "1280x720", label: "16:9 横版" },
  { value: "720x1280", label: "9:16 竖版" },
  { value: "1792x1024", label: "宽屏" },
  { value: "1024x1792", label: "长屏" },
];

// 任务阶段配置
const stageConfig: Record<VideoTaskStage, { label: string; color: string }> = {
  queued: { label: "排队中", color: "text-warning" },
  in_progress: { label: "生成中", color: "text-info" },
  completed: { label: "已完成", color: "text-success" },
  failed: { label: "失败", color: "text-error" },
};

export const VideoGeneratorNode = memo(({ id, data, selected }: NodeProps<VideoGeneratorNode>) => {
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

  // 当前模型
  const currentModel = data.model || "sora-2";

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

  // 打开预览（加载视频并显示弹窗）
  const handleOpenPreview = useCallback(async () => {
    if (!data.taskId || previewState === "loading") return;

    setPreviewState("loading");
    setPreviewError(null);

    const result = await getVideoContentBlobUrl(data.taskId);

    if (result.url) {
      setPreviewUrl(result.url);
      setPreviewState("ready");
    } else {
      setPreviewError(result.error || "加载视频失败");
      setPreviewState("idle");
    }
  }, [data.taskId, previewState]);

  // 关闭预览（卸载视频释放内存）
  const handleClosePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewState("idle");
    setPreviewError(null);
  }, [previewUrl]);

  const handleGenerate = useCallback(async () => {
    // 使用异步版本从文件按需加载图片数据
    const { prompt, images } = await getConnectedInputDataAsync(id);
    // Sora 只支持单张图片输入，取第一张
    const image = images[0];

    if (!prompt) {
      updateNodeData<VideoGeneratorNodeData>(id, {
        status: "error",
        error: "请连接提示词节点",
        errorDetails: undefined,
      });
      return;
    }

    if (!activeCanvasId) {
      updateNodeData<VideoGeneratorNodeData>(id, {
        status: "error",
        error: "画布未初始化",
        errorDetails: undefined,
      });
      return;
    }

    // 清理旧的预览
    handleClosePreview();

    // 重置状态
    updateNodeData<VideoGeneratorNodeData>(id, {
      status: "loading",
      error: undefined,
      progress: 0,
      taskId: undefined,
      taskStage: "queued",
    });

    try {
      // 1. 创建任务
      const createResult = await createVideoTask({
        prompt,
        model: currentModel,
        seconds: data.seconds || "10",
        size: data.size || "1280x720",
        inputImage: image,
      });

      if (createResult.error || !createResult.taskId) {
        updateNodeData<VideoGeneratorNodeData>(id, {
          status: "error",
          error: createResult.error || "创建任务失败",
          errorDetails: createResult.errorDetails,
          taskStage: "failed",
        });
        return;
      }

      const taskId = createResult.taskId;

      // 更新节点的 taskId
      updateNodeData<VideoGeneratorNodeData>(id, {
        taskId,
        taskStage: "queued",
      });

      // 2. 注册到全局任务管理器，由管理器负责轮询和状态同步
      taskManager.registerVideoTask(taskId, id, activeCanvasId);

    } catch {
      updateNodeData<VideoGeneratorNodeData>(id, {
        status: "error",
        error: "生成失败",
        errorDetails: undefined,
        taskStage: "failed",
      });
    }
  }, [id, currentModel, data.seconds, data.size, activeCanvasId, updateNodeData, getConnectedInputDataAsync, handleClosePreview]);

  const handleStop = useCallback(() => {
    // 取消任务管理器中的任务
    if (activeCanvasId) {
      taskManager.cancelTask(id, activeCanvasId);
    }
    updateNodeData<VideoGeneratorNodeData>(id, {
      status: "idle",
      error: undefined,
      progress: 0,
      taskStage: undefined,
    });
  }, [id, activeCanvasId, updateNodeData]);

  const handleDownload = useCallback(async () => {
    if (!data.taskId || isDownloading) return;
    setIsDownloading(true);
    await downloadVideo(data.taskId);
    setIsDownloading(false);
  }, [data.taskId, isDownloading]);

  // 获取当前阶段配置
  const currentStage = data.taskStage ? stageConfig[data.taskStage] : null;

  // 节点样式配置
  const headerGradient = "bg-gradient-to-r from-cyan-500 to-blue-500";
  const outputHandleColor = "!bg-blue-500";

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
    // 检测是否连接了提示词
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
        {/* 输入端口 - prompt 类型（上方） */}
        <Handle
          type="target"
          position={Position.Left}
          id="input-prompt"
          style={{ top: "30%" }}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
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
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        />
        {/* image 端口标签 */}
        <div
          className="absolute -left-9 text-[10px] text-base-content/50"
          style={{ top: "70%", transform: "translateY(-100%)" }}
        >
          首帧图
        </div>

        {/* 节点头部 */}
        <div className={`flex items-center justify-between px-3 py-2 ${headerGradient} rounded-t-lg`}>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-white" />
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
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white uppercase">
              {currentModel === "sora-2-pro" ? "PRO" : "STD"}
            </span>
          </div>
        </div>

        {/* 节点内容 - 简化显示 */}
        <div className="p-2 space-y-2 nodrag">
          {/* 模型显示（只读，点击设置按钮修改） */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">模型</span>
            <span className="font-medium">{getDisplayModelName()}</span>
          </div>

          {/* 配置摘要（简化显示） */}
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>{data.seconds || "10"}秒 · {sizeOptions.find(s => s.value === (data.size || "1280x720"))?.label}</span>
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
              className={`btn btn-sm w-full gap-2 ${!isPromptConnected ? "btn-disabled" : "btn-info"}`}
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

        {/* 输出端口 - video 类型 */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-video"
          className={`!w-3 !h-3 ${outputHandleColor} !border-2 !border-white`}
        />
      </div>

      {/* 详情配置弹窗 */}
      {isDetailModalOpen && (
        <VideoDetailModal
          data={data}
          nodeId={id}
          onClose={() => setIsDetailModalOpen(false)}
          onUpdateData={(updates) => updateNodeData<VideoGeneratorNodeData>(id, updates)}
        />
      )}

      {/* 预览弹窗 */}
      {previewState === "ready" && previewUrl && (
        <VideoPreviewModal
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

VideoGeneratorNode.displayName = "VideoGeneratorNode";

// 视频详情配置弹窗
interface VideoDetailModalProps {
  data: VideoGeneratorNodeData;
  nodeId: string;
  onClose: () => void;
  onUpdateData: (updates: Partial<VideoGeneratorNodeData>) => void;
}

function VideoDetailModal({ data, onClose, onUpdateData }: VideoDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const { addCustomModel, removeCustomModel, getCustomModels } = useCustomModelStore();
  const customModels = getCustomModels("videoGenerator");

  const currentModel = data.model || "sora-2";
  const secondsOptions = getSecondsOptions(currentModel);

  // 检查是否是自定义模型（不在预设列表和用户自定义列表中）
  const isCustomModel = !presetModels.some((m) => m.value === currentModel) && !customModels.includes(currentModel);

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (trimmed) {
      addCustomModel("videoGenerator", trimmed);
      onUpdateData({ model: trimmed as VideoModelType });
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

  // 关闭时先播放退出动画
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
          w-full max-w-md bg-base-100 rounded-2xl shadow-2xl overflow-hidden
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
            <span className="text-base font-medium text-white">视频生成设置</span>
          </div>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-4">
          {/* 模型选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">预设模型</label>
            <div className="flex gap-2">
              {modelOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${currentModel === opt.value ? "btn-info" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => {
                    const newSeconds = opt.value === "sora-2" && data.seconds === "25" ? "15" : data.seconds;
                    onUpdateData({ model: opt.value, seconds: newSeconds });
                  }}
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
                          ? "bg-info/20 text-info border border-info/30"
                          : "bg-base-200 hover:bg-base-300"
                        }
                      `}
                      onClick={() => onUpdateData({ model: model as VideoModelType })}
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
            {/* 自定义模型输入 */}
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
                  className="btn btn-sm btn-info"
                  onClick={handleCustomModelSubmit}
                  disabled={!customModel.trim()}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* 时长选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">视频时长</label>
            <div className="flex gap-2">
              {secondsOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm flex-1
                    ${(data.seconds || "10") === opt.value ? "btn-info" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ seconds: opt.value as VideoGeneratorNodeData["seconds"] })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 尺寸选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">视频尺寸</label>
            <div className="grid grid-cols-2 gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    btn btn-sm
                    ${(data.size || "1280x720") === opt.value ? "btn-info" : "btn-ghost bg-base-200"}
                  `}
                  onClick={() => onUpdateData({ size: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 任务状态详情 */}
          {(data.status === "loading" || data.status === "success" || data.status === "error") && (
            <div className="border-t border-base-300 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-base-content">任务状态</h4>

              {/* 任务ID */}
              {data.taskId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content/60">任务ID</span>
                  <span className="text-base-content font-mono truncate max-w-[200px]">{data.taskId}</span>
                </div>
              )}

              {/* 状态 */}
              {currentStage && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content/60">状态</span>
                  <span className={currentStage.color}>{currentStage.label}</span>
                </div>
              )}

              {/* 进度条 */}
              {data.status === "loading" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-base-content/60">
                    <span>进度</span>
                    <span>{data.progress || 0}%</span>
                  </div>
                  <progress
                    className={`progress w-full h-2 ${
                      data.taskStage === "queued" ? "progress-warning" : "progress-info"
                    }`}
                    value={data.progress || 0}
                    max="100"
                  />
                </div>
              )}

              {/* 错误信息 */}
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
interface VideoPreviewModalProps {
  videoUrl: string;
  taskId?: string;
  onClose: () => void;
}

function VideoPreviewModal({ videoUrl, taskId, onClose }: VideoPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // 下载视频
  const handleDownload = useCallback(async () => {
    if (!taskId || isDownloading) return;

    setIsDownloading(true);
    await downloadVideo(taskId);
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
        {/* 提示信息 */}
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
