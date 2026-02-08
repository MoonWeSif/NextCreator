import { memo, useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { MessageSquareText, Play, AlertCircle, Copy, Check, FileUp, Eye, X, Settings2, ImageIcon, AlertTriangle, CircleAlert, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { generateLLMContent } from "@/services/llmService";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useLLMPresetModels } from "@/config/presetModels";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { useCustomModelStore } from "@/stores/customModelStore";
import type { LLMContentNodeData } from "@/types";

// 定义节点类型
type LLMContentNode = Node<LLMContentNodeData>;

export const LLMContentNode = memo(({ id, data, selected }: NodeProps<LLMContentNode>) => {
  const { updateNodeData, getConnectedInputData, getConnectedInputDataAsync, getConnectedFilesWithInfo, getConnectedImagesWithInfo, getEmptyConnectedInputs } = useFlowStore();
  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const previewModalRef = useRef<HTMLDivElement>(null);

  // 获取当前供应商的预设模型列表
  const { presetModels } = useLLMPresetModels("llmContent");

  // 检测空输入连接
  const emptyInputs = getEmptyConnectedInputs(id);
  const hasEmptyInputs = emptyInputs.emptyImages.length > 0 || emptyInputs.emptyFiles.length > 0;

  // 检测是否有任何有效输入（提示词、图片或文件）
  const { prompt, images, files } = getConnectedInputData(id);
  const hasAnyInput = (prompt !== undefined) || images.length > 0 || files.length > 0;

  // 预览弹窗进入动画
  useEffect(() => {
    if (showFullPreview) {
      setIsPreviewClosing(false);
      requestAnimationFrame(() => setIsPreviewVisible(true));
    }
  }, [showFullPreview]);

  // 关闭预览弹窗（带动画）
  const closePreview = useCallback(() => {
    setIsPreviewClosing(true);
    setIsPreviewVisible(false);
    setTimeout(() => {
      setShowFullPreview(false);
      setIsPreviewClosing(false);
    }, 200);
  }, []);

  // ESC 键关闭预览弹窗
  useEffect(() => {
    if (!showFullPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePreview();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showFullPreview, closePreview]);

  // 弹窗打开时自动聚焦
  useEffect(() => {
    if (showFullPreview && previewModalRef.current) {
      previewModalRef.current.focus();
    }
  }, [showFullPreview]);

  // 省略号加载动画
  const dots = useLoadingDots(data.status === "loading");

  // 保存生成时的画布 ID
  const canvasIdRef = useRef<string | null>(null);

  // 获取显示的模型名称
  const getDisplayModelName = () => {
    const preset = presetModels.find((m) => m.value === data.model);
    return preset ? preset.label : data.model;
  };

  /**
   * 更新节点数据，同时更新 canvasStore
   */
  const updateNodeDataWithCanvas = useCallback(
    (nodeId: string, nodeData: Partial<LLMContentNodeData>) => {
      const { activeCanvasId } = useCanvasStore.getState();
      const targetCanvasId = canvasIdRef.current;

      updateNodeData<LLMContentNodeData>(nodeId, nodeData);

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
              c.id === targetCanvasId ? { ...c, nodes: updatedNodes, updatedAt: Date.now() } : c
            ),
          }));
        }
      }
    },
    [updateNodeData]
  );

  // 执行生成（支持流式）
  const handleGenerate = useCallback(async () => {
    // 使用异步版本从文件按需加载图片数据
    const { prompt, files, images } = await getConnectedInputDataAsync(id);
    const { activeCanvasId } = useCanvasStore.getState();

    canvasIdRef.current = activeCanvasId;

    if (!prompt && files.length === 0 && images.length === 0) {
      updateNodeDataWithCanvas(id, {
        status: "error",
        error: "请连接提示词节点、文件上传节点或图片输入节点",
        errorDetails: undefined,
      });
      return;
    }

    updateNodeDataWithCanvas(id, {
      status: "loading",
      error: undefined,
      outputContent: "",
    });

    try {
      // 将图片转换为文件格式（LLM 服务支持图片作为文件输入）
      const imageFiles = images.map((imageData, index) => ({
        data: imageData,
        mimeType: imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        fileName: `image-${index + 1}.${imageData.startsWith("data:image/png") ? "png" : "jpg"}`,
      }));

      const allFiles = [...files, ...imageFiles];

      const response = await generateLLMContent({
        prompt: prompt || "请分析这个文件的内容",
        model: data.model,
        systemPrompt: data.systemPrompt || undefined,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        files: allFiles.length > 0 ? allFiles : undefined,
      });

      if (response.content) {
        updateNodeDataWithCanvas(id, {
          status: "success",
          outputContent: response.content,
          error: undefined,
          errorDetails: undefined,
        });
      } else if (response.error) {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: response.error,
          errorDetails: response.errorDetails,
        });
      } else {
        updateNodeDataWithCanvas(id, {
          status: "error",
          error: "未返回内容",
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
  }, [id, data.model, data.systemPrompt, data.temperature, data.maxTokens, updateNodeDataWithCanvas, getConnectedInputDataAsync]);

  // 复制内容
  const handleCopy = useCallback(() => {
    if (data.outputContent) {
      navigator.clipboard.writeText(data.outputContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data.outputContent]);

  return (
    <div
      className={`
        w-[280px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
        ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
      `}
    >
      {/* 输入端口 - prompt 类型 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-prompt"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        style={{ top: "25%" }}
      />
      {/* prompt 端口标签 */}
      <div
        className="absolute -left-9 text-[10px] text-base-content/50 tooltip tooltip-left"
        style={{ top: "25%", transform: "translateY(-100%)" }}
        data-tip="支持多个输入，将自动拼接"
      >
        提示词
      </div>

      {/* 输入端口 - image 类型 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-image"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        style={{ top: "50%" }}
      />
      {/* image 端口标签 */}
      <div
        className="absolute -left-6 text-[10px] text-base-content/50"
        style={{ top: "50%", transform: "translateY(-100%)" }}
      >
        图片
      </div>

      {/* 输入端口 - file 类型 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-file"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
        style={{ top: "75%" }}
      />
      {/* file 端口标签 */}
      <div
        className="absolute -left-6 text-[10px] text-base-content/50"
        style={{ top: "75%", transform: "translateY(-100%)" }}
      >
        文件
      </div>

      {/* 节点头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">{data.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 未连接任何输入警告 */}
          {!hasAnyInput && (
            <div className="tooltip tooltip-left" data-tip="请连接提示词、图片或文件节点">
              <CircleAlert className="w-4 h-4 text-white/80" />
            </div>
          )}
          {/* 空输入警告图标 */}
          {hasAnyInput && hasEmptyInputs && (
            <div
              className="tooltip tooltip-left"
              data-tip={`输入为空: ${[
                ...emptyInputs.emptyImages.map(i => `图片-${i.label}`),
                ...emptyInputs.emptyFiles.map(f => `文件-${f.label}`),
              ].join(", ")}`}
            >
              <AlertTriangle className="w-4 h-4 text-yellow-300" />
            </div>
          )}
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">LLM</span>
        </div>
      </div>

      {/* 节点内容 - 简化显示 */}
      <div className="p-2 space-y-2 nodrag">
        {/* 已连接图片指示器 */}
        {(() => {
          const connectedImages = getConnectedImagesWithInfo(id);
          if (connectedImages.length === 0) return null;
          return (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-green-500/10 rounded-lg">
              <ImageIcon className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-green-600">
                {connectedImages.length} 张图片已连接
              </span>
            </div>
          );
        })()}

        {/* 已连接文件指示器 */}
        {(() => {
          const connectedFiles = getConnectedFilesWithInfo(id);
          if (connectedFiles.length === 0) return null;
          return (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-orange-500/10 rounded-lg">
              <FileUp className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-orange-600">
                {connectedFiles.length} 个文件已连接
              </span>
            </div>
          );
        })()}

        {/* 模型显示（只读，点击设置按钮修改） */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-base-content/60">模型</span>
          <span className="font-medium">{getDisplayModelName()}</span>
        </div>

        {/* 配置摘要 */}
        <div className="flex items-center justify-between text-xs text-base-content/60">
          <span>
            温度 {data.temperature.toFixed(1)} · {data.maxTokens} tokens
          </span>
          <button
            className="btn btn-ghost btn-xs px-1"
            onClick={() => setIsSettingsOpen(true)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 生成按钮 */}
        <button
          className={`btn btn-sm w-full gap-2 ${
            data.status === "loading" || !hasAnyInput ? "btn-disabled" : "btn-primary"
          }`}
          onClick={handleGenerate}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={data.status === "loading" || !hasAnyInput}
        >
          {data.status === "loading" ? (
            <span>生成中{dots}</span>
          ) : !hasAnyInput ? (
            <span className="text-base-content/50">待连接输入</span>
          ) : (
            <>
              <Play className="w-4 h-4" />
              生成内容
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

        {/* 输出内容预览 */}
        {data.outputContent && (
          <div
            className="bg-base-200 rounded-lg p-2 cursor-pointer hover:bg-base-300 transition-colors"
            onClick={() => setShowFullPreview(true)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-base-content line-clamp-3 mb-1">
              {data.outputContent.replace(/[#*`>\-\[\]]/g, '').slice(0, 150)}
            </p>
            <div className="flex items-center justify-end gap-1 text-xs text-primary">
              <Eye className="w-3 h-3" />
              <span>查看详情</span>
            </div>
          </div>
        )}
      </div>

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-prompt"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />

      {/* 设置弹窗 */}
      {isSettingsOpen && (
        <LLMSettingsModal
          data={data}
          presetModels={presetModels}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateData={(updates) => updateNodeData<LLMContentNodeData>(id, updates)}
        />
      )}

      {/* 全屏预览弹窗 */}
      {showFullPreview && data.outputContent && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className={`
              absolute inset-0
              transition-all duration-200 ease-out
              ${isPreviewVisible && !isPreviewClosing ? "bg-black/60" : "bg-black/0"}
            `}
            onClick={closePreview}
          />
          <div
            ref={previewModalRef}
            tabIndex={-1}
            className={`
              relative bg-base-100 rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col outline-none
              transition-all duration-200 ease-out
              ${isPreviewVisible && !isPreviewClosing
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-4"
              }
            `}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-base-300 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-primary" />
                <span className="font-medium">内容预览</span>
                <span className="text-xs text-base-content/50 ml-2">{data.model}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm gap-1" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  <span className="text-xs">{copied ? "已复制" : "复制"}</span>
                </button>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={closePreview}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6 select-text">
              <div className="prose prose-base max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-base-200 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                      ) : (
                        <code className="block bg-base-200 p-4 rounded-lg text-sm font-mono overflow-x-auto">{children}</code>
                      );
                    },
                    pre: ({ children }) => <pre className="bg-base-200 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic opacity-80 my-4">{children}</blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="table table-zebra w-full">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th className="bg-base-200 font-bold">{children}</th>,
                    td: ({ children }) => <td>{children}</td>,
                  }}
                >
                  {data.outputContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
    </div>
  );
});

LLMContentNode.displayName = "LLMContentNode";

// 设置弹窗组件
interface LLMSettingsModalProps {
  data: LLMContentNodeData;
  presetModels: Array<{ value: string; label: string }>;
  onClose: () => void;
  onUpdateData: (updates: Partial<LLMContentNodeData>) => void;
}

function LLMSettingsModal({ data, presetModels, onClose, onUpdateData }: LLMSettingsModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");
  // 使用本地 state 缓冲 systemPrompt，避免中文输入时因频繁更新 store 导致乱码
  const [localSystemPrompt, setLocalSystemPrompt] = useState(data.systemPrompt || "");

  const { addCustomModel, removeCustomModel, getCustomModels } = useCustomModelStore();
  const customModels = getCustomModels("llmContent");

  // 检查是否是自定义模型（不在预设列表和用户自定义列表中）
  const isCustomModel = !presetModels.some((m) => m.value === data.model) && !customModels.includes(data.model);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 关闭时同步 systemPrompt 到 store，并播放退出动画
  const handleClose = useCallback(() => {
    // 关闭前同步本地 systemPrompt 到 store
    if (localSystemPrompt !== (data.systemPrompt || "")) {
      onUpdateData({ systemPrompt: localSystemPrompt });
    }
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose, localSystemPrompt, data.systemPrompt, onUpdateData]);

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

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (trimmed) {
      addCustomModel("llmContent", trimmed);
      onUpdateData({ model: trimmed });
      setCustomModel("");
    }
  };

  // 删除用户自定义模型
  const handleRemoveCustomModel = (model: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomModel("llmContent", model);
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
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-white" />
            <span className="text-base font-medium text-white">LLM 设置</span>
          </div>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 模型选择 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">预设模型</label>
            <div className="space-y-1">
              {presetModels.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`
                    w-full px-3 py-2 text-left text-sm rounded-lg
                    flex items-center justify-between transition-colors
                    ${data.model === opt.value
                      ? "bg-info/20 text-info border border-info/30"
                      : "bg-base-200 hover:bg-base-300"
                    }
                  `}
                  onClick={() => onUpdateData({ model: opt.value })}
                >
                  <span>{opt.label}</span>
                  {data.model === opt.value && <Check className="w-4 h-4" />}
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
                        ${data.model === model
                          ? "bg-info/20 text-info border border-info/30"
                          : "bg-base-200 hover:bg-base-300"
                        }
                      `}
                      onClick={() => onUpdateData({ model })}
                    >
                      <span className="truncate">{model}</span>
                      <div className="flex items-center gap-1">
                        {data.model === model && <Check className="w-4 h-4" />}
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
                当前使用自定义模型: {data.model}
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

          {/* 系统提示词 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">系统提示词</label>
            <textarea
              className="textarea textarea-bordered w-full h-20 text-sm resize-none"
              placeholder="可选：设置 AI 角色或行为..."
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
            />
          </div>

          {/* 温度 */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">
              温度: {data.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={data.temperature}
              onChange={(e) => onUpdateData({ temperature: parseFloat(e.target.value) })}
              className="range range-sm range-info"
            />
            <div className="flex justify-between text-xs text-base-content/50 mt-1">
              <span>精确</span>
              <span>创意</span>
            </div>
          </div>

          {/* 最大输出 Tokens */}
          <div>
            <label className="text-sm font-medium text-base-content mb-2 block">最大输出 Tokens</label>
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              value={data.maxTokens}
              min={100}
              max={65536}
              step={100}
              onChange={(e) => onUpdateData({ maxTokens: parseInt(e.target.value) || 8192 })}
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end px-4 py-3 bg-base-200/50 border-t border-base-300">
          <span className="text-xs text-base-content/50 mr-auto">按 ESC 关闭</span>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
