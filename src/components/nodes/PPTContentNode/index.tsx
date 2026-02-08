import { memo, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import {
  FileText,
  Settings,
  List,
  Image,
  X,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Type,
  Check,
  Info,
  FileUp,
  LayoutTemplate,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { getImageUrl } from "@/services/fileStorageService";
import type { PPTContentNodeData, PPTOutline, PPTPageItem, VisualStyleTemplate, ConnectedImageInfo } from "./types";
import type { ImageInputNodeData } from "@/types";
import { ConfigTab } from "./ConfigTab";
import { OutlineTab } from "./OutlineTab";
import { PagesTab } from "./PagesTab";
import { usePPTContentExecution } from "./usePPTContentExecution";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { BuiltinTemplateModal, type BuiltinTemplate } from "./BuiltinTemplateModal";

// 定义节点类型
type PPTContentNode = Node<PPTContentNodeData>;

// 标签页定义
const tabs = [
  { id: "config" as const, label: "配置", icon: Settings },
  { id: "outline" as const, label: "大纲", icon: List },
  { id: "pages" as const, label: "页面", icon: Image },
];

// PPT 内容生成节点
export const PPTContentNode = memo(({ id, data, selected }: NodeProps<PPTContentNode>) => {
  const { updateNodeData, getConnectedInputData, getConnectedImagesWithInfo, getConnectedFilesWithInfo, addNode } = useFlowStore();
  const { addEdges, getNode } = useReactFlow();

  // 省略号加载动画
  const outlineDots = useLoadingDots(data.outlineStatus === "generating");
  const pagesDots = useLoadingDots(data.generationStatus === "running");

  // 详情面板弹窗状态
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  // 讲稿弹窗状态
  const [showScriptModal, setShowScriptModal] = useState<PPTPageItem | null>(null);
  // 弹窗动画状态
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);
  const [isScriptModalVisible, setIsScriptModalVisible] = useState(false);
  // 内置模板弹窗状态
  const [showBuiltinTemplateModal, setShowBuiltinTemplateModal] = useState(false);
  // 弹窗 ref，用于自动聚焦
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const scriptModalRef = useRef<HTMLDivElement>(null);

  // 详情面板打开时自动聚焦，使键盘事件能被弹窗捕获
  useEffect(() => {
    if (showDetailPanel && isDetailPanelVisible && detailPanelRef.current) {
      detailPanelRef.current.focus();
    }
  }, [showDetailPanel, isDetailPanelVisible]);

  // 讲稿弹窗打开时自动聚焦，使键盘事件能被弹窗捕获
  useEffect(() => {
    if (showScriptModal && isScriptModalVisible && scriptModalRef.current) {
      scriptModalRef.current.focus();
    }
  }, [showScriptModal, isScriptModalVisible]);

  // 处理详情面板的打开/关闭动画
  const openDetailPanel = useCallback(() => {
    setShowDetailPanel(true);
    requestAnimationFrame(() => setIsDetailPanelVisible(true));
  }, []);

  const closeDetailPanel = useCallback(() => {
    setIsDetailPanelVisible(false);
    setTimeout(() => setShowDetailPanel(false), 200);
  }, []);

  // 处理讲稿弹窗的打开/关闭动画
  const openScriptModal = useCallback((item: PPTPageItem) => {
    setShowScriptModal(item);
    requestAnimationFrame(() => setIsScriptModalVisible(true));
  }, []);

  const closeScriptModal = useCallback(() => {
    setIsScriptModalVisible(false);
    setTimeout(() => setShowScriptModal(null), 200);
  }, []);

  // 获取所有连接的图片信息
  const getConnectedImages = useCallback((): ConnectedImageInfo[] => {
    return getConnectedImagesWithInfo(id);
  }, [id, getConnectedImagesWithInfo]);

  // 获取所有连接的文件信息
  const getConnectedFiles = useCallback(() => {
    return getConnectedFilesWithInfo(id);
  }, [id, getConnectedFilesWithInfo]);

  // 获取模板基底图（支持多图选择）
  // 注意：此函数用于同步检查是否有模板图，返回 imageData 或 imagePath
  const getTemplateImage = useCallback(() => {
    const images = getConnectedImages();
    if (images.length === 0) return undefined;

    // 如果有选中的基底图 ID，使用它
    if (data.selectedTemplateId) {
      const selected = images.find(img => img.id === data.selectedTemplateId);
      // 返回 imageData 或 imagePath（任一存在即表示有图片）
      if (selected) return selected.imageData || selected.imagePath;
    }

    // 默认使用第一张
    return images[0]?.imageData || images[0]?.imagePath;
  }, [getConnectedImages, data.selectedTemplateId]);

  // 选择基底图
  const handleSelectTemplate = useCallback((templateId: string) => {
    updateNodeData<PPTContentNodeData>(id, { selectedTemplateId: templateId });
  }, [id, updateNodeData]);

  // 使用内置模板 - 创建 ImageInputNode 并自动连接
  const handleSelectBuiltinTemplate = useCallback((template: BuiltinTemplate, imageData: string) => {
    // 获取当前节点位置，将新节点放在左侧
    const currentNode = getNode(id);
    const nodePosition = currentNode?.position || { x: 0, y: 0 };

    // 创建 ImageInputNode，位置在当前节点左侧
    const newNodeId = addNode(
      "imageInputNode",
      {
        x: nodePosition.x - 280,
        y: nodePosition.y + 50  // 对应 input-image 端口的位置
      },
      {
        label: template.name,
        imageData: imageData,
        fileName: `${template.name}.png`,
      } as ImageInputNodeData
    );

    // 创建连接：ImageInputNode 的输出连接到当前节点的 input-image 端口
    addEdges([{
      id: `${newNodeId}-${id}-image`,
      source: newNodeId,
      target: id,
      sourceHandle: "output-image",
      targetHandle: "input-image",
    }]);

    // 关闭弹窗
    setShowBuiltinTemplateModal(false);
  }, [id, getNode, addNode, addEdges]);

  // 获取提示词文本（用于节点摘要展示）
  const getPromptText = useCallback(() => {
    const { prompt } = getConnectedInputData(id);
    return prompt;
  }, [id, getConnectedInputData]);

  // 检查是否有提示词或文件输入
  const hasPromptInput = useCallback(() => {
    const { prompt, files } = getConnectedInputData(id);
    return !!prompt || files.length > 0;
  }, [id, getConnectedInputData]);

  // 使用执行逻辑 Hook
  const execution = usePPTContentExecution({
    nodeId: id,
    data,
    getTemplateImage,
    getConnectedImages,
  });

  // 切换标签页
  const handleTabChange = useCallback((tabId: PPTContentNodeData["activeTab"]) => {
    updateNodeData<PPTContentNodeData>(id, { activeTab: tabId });
  }, [id, updateNodeData]);

  // 更新大纲配置
  const handleConfigChange = useCallback((config: Partial<PPTContentNodeData["outlineConfig"]>) => {
    updateNodeData<PPTContentNodeData>(id, {
      outlineConfig: { ...data.outlineConfig, ...config },
    });
  }, [id, data.outlineConfig, updateNodeData]);

  // 生成大纲
  const handleGenerateOutline = useCallback(() => {
    const { prompt, files } = getConnectedInputData(id);
    if (!prompt && files.length === 0) {
      updateNodeData<PPTContentNodeData>(id, {
        outlineStatus: "error",
        outlineError: "请先连接提示词节点或文件上传节点",
      });
      return;
    }
    execution.generateOutline(prompt || "根据文件内容生成 PPT 大纲", files);
    // 切换到大纲标签页
    updateNodeData<PPTContentNodeData>(id, { activeTab: "outline" });
  }, [id, getConnectedInputData, execution, updateNodeData]);

  // 更新大纲
  const handleUpdateOutline = useCallback((outline: PPTOutline) => {
    execution.updateOutline(outline);
  }, [execution]);

  // 更新视觉风格模板
  const handleChangeStyleTemplate = useCallback((template: VisualStyleTemplate) => {
    updateNodeData<PPTContentNodeData>(id, { visualStyleTemplate: template });
  }, [id, updateNodeData]);

  // 更新图片配置
  const handleChangeImageConfig = useCallback((config: Partial<PPTContentNodeData["imageConfig"]>) => {
    updateNodeData<PPTContentNodeData>(id, {
      imageConfig: { ...data.imageConfig, ...config },
    });
  }, [id, data.imageConfig, updateNodeData]);

  // 更新首页是否为标题页
  const handleChangeFirstPageIsTitlePage = useCallback((value: boolean) => {
    updateNodeData<PPTContentNodeData>(id, { firstPageIsTitlePage: value });
  }, [id, updateNodeData]);

  // 更新自定义视觉风格提示词
  const handleChangeCustomStylePrompt = useCallback((prompt: string) => {
    updateNodeData<PPTContentNodeData>(id, { customVisualStylePrompt: prompt });
  }, [id, updateNodeData]);

  // 显示讲稿
  const handleShowScript = useCallback((item: PPTPageItem) => {
    openScriptModal(item);
  }, [openScriptModal]);

  // 渲染标签页内容（仅用于详情弹窗）
  const renderTabContent = () => {
    switch (data.activeTab) {
      case "config":
        return (
          <div className="h-full flex flex-col">
            <ConfigTab
              config={data.outlineConfig}
              outlineModel={data.outlineModel || "gemini-3-pro-preview"}
              imageModel={data.imageModel || "gemini-3-pro-image-preview"}
              imageConfig={data.imageConfig}
              visualStyleTemplate={data.visualStyleTemplate}
              customVisualStylePrompt={data.customVisualStylePrompt}
              firstPageIsTitlePage={data.firstPageIsTitlePage ?? true}
              onChange={handleConfigChange}
              onModelChange={(model) => updateNodeData<PPTContentNodeData>(id, { outlineModel: model })}
              onImageModelChange={(model) => updateNodeData<PPTContentNodeData>(id, { imageModel: model })}
              onChangeImageConfig={handleChangeImageConfig}
              onChangeStyleTemplate={handleChangeStyleTemplate}
              onChangeCustomStylePrompt={handleChangeCustomStylePrompt}
              onChangeFirstPageIsTitlePage={handleChangeFirstPageIsTitlePage}
            />
            {/* 弹性空间 */}
            <div className="flex-1" />
            {/* 生成大纲按钮 - 固定在底部 */}
            <div className="mt-4 pt-4 border-t border-base-300">
              <button
                className="btn btn-primary w-full gap-1.5"
                onClick={handleGenerateOutline}
                disabled={data.outlineStatus === "generating" || !hasPromptInput()}
              >
                {data.outlineStatus === "generating" ? (
                  <span>生成中{outlineDots}</span>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    生成大纲
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "outline":
        return (
          <OutlineTab
            outline={data.outline}
            outlineStatus={data.outlineStatus}
            outlineError={data.outlineError}
            onGenerateOutline={handleGenerateOutline}
            onUpdateOutline={handleUpdateOutline}
            hasPromptInput={hasPromptInput()}
            connectedImages={getConnectedImages()}
            selectedTemplateId={data.selectedTemplateId}
          />
        );

      case "pages":
        return (
          <PagesTab
            pages={data.pages}
            generationStatus={data.generationStatus}
            progress={data.progress}
            hasTemplateImage={!!getTemplateImage()}
            connectedImages={getConnectedImages()}
            onStartAll={execution.startGeneration}
            onPauseAll={execution.pauseGeneration}
            onResumeAll={execution.resumeGeneration}
            onRetryFailed={execution.retryFailed}
            onRetryPage={execution.retryPage}
            onSkipPage={execution.skipPage}
            onRunPage={execution.runPage}
            onStopPage={execution.stopPage}
            onUploadImage={execution.uploadPageImage}
            onShowScript={handleShowScript}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={`
          w-[360px] rounded-xl bg-base-100 shadow-lg border-2 transition-all duration-200
          ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
        `}
      >
        {/* 输入端口 */}
        <Handle
          type="target"
          position={Position.Left}
          id="input-prompt"
          style={{ top: "15%" }}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        />
        {/* prompt 端口标签 */}
        <div
          className="absolute -left-6 text-[10px] text-base-content/50 tooltip tooltip-left"
          style={{ top: "15%", transform: "translateY(-100%)" }}
          data-tip="支持多个输入，将自动拼接"
        >
          主题
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="input-image"
          style={{ top: "40%" }}
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        />
        {/* image 端口标签 */}
        <div
          className="absolute -left-9 text-[10px] text-base-content/50"
          style={{ top: "40%", transform: "translateY(-100%)" }}
        >
          模板图
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="input-file"
          style={{ top: "65%" }}
          className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
        />
        {/* file 端口标签 */}
        <div
          className="absolute -left-12 text-[10px] text-base-content/50"
          style={{ top: "65%", transform: "translateY(-100%)" }}
        >
          参考文件
        </div>

        {/* 节点头部 */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">{data.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">
              PPT
            </span>
            <button
              className="btn btn-ghost btn-xs p-1 text-white/70 hover:text-white hover:bg-white/10"
              onClick={openDetailPanel}
              title="展开详情"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 节点内容 */}
        <div className="p-3 nodrag nowheel space-y-3">
          {/* 生成前提条件 */}
          <div className="space-y-2">
            <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium">
              生成前提
            </div>

            {/* 提示词状态卡片 */}
            <div
              className={`
                flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all
                ${getPromptText()
                  ? "bg-success/5 border-success/30"
                  : "bg-warning/5 border-warning/30"
                }
              `}
            >
              <div className={`
                p-1.5 rounded-md
                ${getPromptText() ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
              `}>
                <Type className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-base-content/70">提示词</div>
                <div className={`text-xs truncate ${getPromptText() ? "text-base-content/60" : "text-warning"}`}>
                  {getPromptText() || "请连接提示词节点"}
                </div>
              </div>
              {getPromptText() ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              )}
            </div>

            {/* 模板基底图状态卡片 */}
            {(() => {
              const connectedImages = getConnectedImages();
              const hasImages = connectedImages.length > 0;
              const hasMultipleImages = connectedImages.length > 1;
              const selectedId = data.selectedTemplateId || connectedImages[0]?.id;

              return (
                <div
                  className={`
                    rounded-lg border transition-all
                    ${hasImages
                      ? "bg-success/5 border-success/30"
                      : "bg-warning/5 border-warning/30"
                    }
                  `}
                >
                  {/* 头部信息 */}
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <div className={`
                      p-1.5 rounded-md
                      ${hasImages ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
                    `}>
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-base-content/70">模板基底图</div>
                      <div className={`text-xs ${hasImages ? "text-base-content/60" : "text-warning"}`}>
                        {hasImages
                          ? hasMultipleImages
                            ? `已连接 ${connectedImages.length} 张，点击选择`
                            : "已连接"
                          : "请连接图片节点"
                        }
                      </div>
                    </div>
                    {hasImages ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                    )}
                  </div>

                  {/* 使用内置模板按钮 - 没有连接图片时显示 */}
                  {!hasImages && (
                    <div className="px-2.5 pb-2.5">
                      <button
                        className="btn btn-xs btn-outline btn-primary w-full gap-1.5"
                        onClick={() => setShowBuiltinTemplateModal(true)}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <LayoutTemplate className="w-3 h-3" />
                        使用内置模板
                      </button>
                    </div>
                  )}

                  {/* 多图选择器 */}
                  {hasMultipleImages && (
                    <div className="px-2.5 pb-2.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {connectedImages.map((img) => {
                          const isSelected = img.id === selectedId;
                          return (
                            <div
                              key={img.id}
                              className={`
                                relative w-10 h-10 rounded-md overflow-hidden cursor-pointer
                                border-2 transition-all
                                ${isSelected
                                  ? "border-primary shadow-md"
                                  : "border-transparent hover:border-base-300"
                                }
                              `}
                              onClick={() => handleSelectTemplate(img.id)}
                              title={img.fileName || `图片-${img.id.slice(0, 4)}`}
                            >
                              <img
                                src={
                                  img.imagePath
                                    ? getImageUrl(img.imagePath)
                                    : img.imageData
                                      ? `data:image/png;base64,${img.imageData}`
                                      : undefined
                                }
                                alt={img.fileName || "图片"}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-content" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* 说明文字 */}
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-base-content/50">
                        <Info className="w-3 h-3" />
                        <span>基底图决定 PPT 的整体风格和版式</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 参考文件状态卡片 */}
            {(() => {
              const connectedFiles = getConnectedFiles();
              const hasFiles = connectedFiles.length > 0;

              if (!hasFiles) return null;

              return (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-orange-500/5 border-orange-500/30">
                  <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                    <FileUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-base-content/70">参考文件</div>
                    <div className="text-xs text-base-content/60">
                      已连接 {connectedFiles.length} 个文件
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                </div>
              );
            })()}
          </div>

          {/* 生成进度 */}
          <div className="space-y-2">
            <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium">
              生成进度
            </div>

            {/* 大纲进度 */}
            <div className="flex items-center gap-2">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${data.outlineStatus === "ready"
                  ? "bg-success text-success-content"
                  : data.outlineStatus === "generating"
                  ? "bg-info text-info-content"
                  : data.outlineStatus === "error"
                  ? "bg-error text-error-content"
                  : "bg-base-300 text-base-content/40"
                }
              `}>
                {data.outlineStatus === "generating" ? (
                  <span className="text-[10px] font-bold">{outlineDots}</span>
                ) : data.outlineStatus === "ready" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : data.outlineStatus === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  "1"
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium">大纲生成</div>
                <div className="text-[11px] text-base-content/50">
                  {data.outlineStatus === "ready"
                    ? `已生成 ${data.outline?.pages.length || 0} 页`
                    : data.outlineStatus === "generating"
                    ? "正在生成..."
                    : data.outlineStatus === "error"
                    ? "生成失败"
                    : "等待开始"}
                </div>
              </div>
            </div>

            {/* 连接线 */}
            <div className="ml-3 w-px h-2 bg-base-300" />

            {/* 页面图片进度 */}
            {(() => {
              // 计算各状态的统计
              const stats = {
                pending: data.pages.filter(p => p.status === "pending").length,
                running: data.pages.filter(p => p.status === "running").length,
                completed: data.pages.filter(p => p.status === "completed" || p.status === "skipped").length,
                failed: data.pages.filter(p => p.status === "failed").length,
              };
              const total = data.pages.length;
              const isRunning = stats.running > 0 || data.generationStatus === "running";
              const isCompleted = stats.completed === total && total > 0;

              return (
                <>
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isCompleted
                        ? "bg-success text-success-content"
                        : isRunning
                        ? "bg-info text-info-content"
                        : data.generationStatus === "paused"
                        ? "bg-warning text-warning-content"
                        : "bg-base-300 text-base-content/40"
                      }
                    `}>
                      {isRunning ? (
                        <span className="text-[10px] font-bold">{pagesDots}</span>
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        "2"
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium">页面图片</div>
                      <div className="text-[11px] text-base-content/50">
                        {total === 0
                          ? "等待大纲"
                          : isRunning
                          ? `生成中 ${stats.completed}/${total}`
                          : isCompleted
                          ? `全部完成 ${stats.completed}/${total}`
                          : data.generationStatus === "paused"
                          ? `已暂停 ${stats.completed}/${total}`
                          : `${stats.completed}/${total} 已完成`
                        }
                      </div>
                    </div>
                  </div>

                  {/* 详细统计 */}
                  {total > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-base-content/50 flex-wrap ml-8">
                      {stats.completed > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          完成 {stats.completed}
                        </span>
                      )}
                      {stats.running > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-info" />
                          进行中 {stats.running}
                        </span>
                      )}
                      {stats.pending > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-base-content/30" />
                          待生成 {stats.pending}
                        </span>
                      )}
                      {stats.failed > 0 && (
                        <span className="flex items-center gap-0.5 text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          失败 {stats.failed}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 进度条 */}
                  {total > 0 && (
                    <div className="mt-1">
                      <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted
                              ? "bg-success"
                              : isRunning
                              ? "bg-info"
                              : stats.failed > 0
                              ? "bg-error"
                              : "bg-warning"
                          }`}
                          style={{ width: `${(stats.completed / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* 打开配置面板按钮 */}
          <button
            className="btn btn-primary btn-sm w-full gap-2 nopan nodrag"
            onClick={openDetailPanel}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Settings className="w-4 h-4" />
            打开配置面板
          </button>
        </div>

        {/* 输出端口 */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-results"
          className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
          title="PPT 页面数据"
        />
      </div>

      {/* 详情面板弹窗 - 使用 Portal 渲染到 body */}
      {showDetailPanel && createPortal(
        <div
          className={`
            fixed inset-0 flex items-center justify-center z-50
            transition-all duration-200 ease-out
            ${isDetailPanelVisible ? "bg-black/50" : "bg-black/0"}
          `}
          onClick={closeDetailPanel}
        >
          <div
            ref={detailPanelRef}
            tabIndex={-1}
            className={`
              bg-base-100 rounded-xl shadow-2xl w-[900px] h-[85vh] flex flex-col outline-none
              transition-all duration-200 ease-out
              ${isDetailPanelVisible
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-4"
              }
            `}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-300">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium text-lg">{data.label}</span>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={closeDetailPanel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 标签页导航 */}
            <div className="flex border-b border-base-300 bg-base-200/30 px-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = data.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`
                      relative flex items-center gap-2 px-5 py-3 text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? "text-primary"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200/50"
                      }
                    `}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                    {tab.label}
                    {/* 下划线指示器 */}
                    <span
                      className={`
                        absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full
                        transition-all duration-200 ease-out
                        ${isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
                      `}
                    />
                  </button>
                );
              })}
            </div>

            {/* 弹窗内容 - 固定高度避免跳动 */}
            <div className="flex-1 overflow-hidden relative">
              <div
                key={data.activeTab}
                className="absolute inset-0 overflow-y-auto p-5 animate-tab-content"
              >
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 讲稿弹窗 - 使用 Portal 渲染到 body */}
      {showScriptModal && createPortal(
        <div
          className={`
            fixed inset-0 flex items-center justify-center z-50
            transition-all duration-200 ease-out
            ${isScriptModalVisible ? "bg-black/50" : "bg-black/0"}
          `}
          onClick={closeScriptModal}
        >
          <div
            ref={scriptModalRef}
            tabIndex={-1}
            className={`
              bg-base-100 rounded-xl shadow-2xl w-[500px] max-h-[80vh] p-4 outline-none
              transition-all duration-200 ease-out
              ${isScriptModalVisible
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-4"
              }
            `}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                第 {showScriptModal.pageNumber} 页 - 口头讲稿
              </h3>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={closeScriptModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3">
              <p className="text-sm font-medium text-primary mb-1">{showScriptModal.heading}</p>
              <div className="text-xs text-base-content/60 mb-2">
                {showScriptModal.points.map((point, i) => (
                  <div key={i}>• {point}</div>
                ))}
              </div>
            </div>
            <div className="bg-base-200 rounded-lg p-3 select-text">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {showScriptModal.script}
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(showScriptModal.script);
                }}
              >
                复制讲稿
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 内置模板选择弹窗 */}
      <BuiltinTemplateModal
        isOpen={showBuiltinTemplateModal}
        onClose={() => setShowBuiltinTemplateModal(false)}
        onSelect={handleSelectBuiltinTemplate}
      />
    </>
  );
});

PPTContentNode.displayName = "PPTContentNode";

export default PPTContentNode;
