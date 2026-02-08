import { useState, useRef, useCallback, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  FileText,
  Image,
  Mic,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { PPTOutline, PPTContentNodeData, ConnectedImageInfo, PageSupplement } from "./types";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ImageRefTag } from "./ImageRefTag";
import { ImageSelectorModal } from "./ImageSelectorModal";

// 独立的补充说明输入组件，使用自己的状态管理
function SupplementTextInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);

  // 同步外部 value 变化
  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <div>
      <label className="text-[11px] text-base-content/50 mb-1.5 block">
        补充说明
      </label>
      <textarea
        className="textarea textarea-bordered textarea-sm w-full min-h-[60px] resize-none text-sm"
        value={localValue}
        placeholder="输入额外的说明或要求，会作为 AI 生成图片的提示词..."
        onChange={(e) => {
          setLocalValue(e.target.value);
          if (!isComposingRef.current) {
            onChange(e.target.value);
          }
        }}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          onChange(e.currentTarget.value);
        }}
      />
    </div>
  );
}

// 独立的文本输入组件，正确处理中文输入法
function ComposableInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);

  // 同步外部 value 变化
  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <input
      type="text"
      className={className}
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (!isComposingRef.current) {
          onChange(e.target.value);
        }
      }}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={(e) => {
        isComposingRef.current = false;
        onChange(e.currentTarget.value);
      }}
    />
  );
}

// 独立的文本域组件，正确处理中文输入法
function ComposableTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);

  // 同步外部 value 变化
  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <textarea
      className={className}
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (!isComposingRef.current) {
          onChange(e.target.value);
        }
      }}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={(e) => {
        isComposingRef.current = false;
        onChange(e.currentTarget.value);
      }}
    />
  );
}

interface OutlineTabProps {
  outline?: PPTOutline;
  outlineStatus: PPTContentNodeData["outlineStatus"];
  outlineError?: string;
  onGenerateOutline: () => void;
  onUpdateOutline: (outline: PPTOutline) => void;
  hasPromptInput: boolean;
  connectedImages: ConnectedImageInfo[];
  selectedTemplateId?: string;
}

export function OutlineTab({
  outline,
  outlineStatus,
  outlineError,
  onGenerateOutline,
  onUpdateOutline,
  hasPromptInput,
  connectedImages,
  selectedTemplateId,
}: OutlineTabProps) {
  // 当前展开的页面索引集合
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([0]));

  // 图片选择器弹窗状态
  const [imageSelectorPage, setImageSelectorPage] = useState<number | null>(null);

  // 切换页面展开状态
  const togglePage = useCallback((index: number) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // 更新大纲标题
  const updateTitle = useCallback((value: string) => {
    if (!outline) return;
    onUpdateOutline({ ...outline, title: value });
  }, [outline, onUpdateOutline]);

  // 更新页面字段
  const updatePageField = useCallback((index: number, field: string, value: string) => {
    if (!outline) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages.map((page, i) =>
        i === index ? { ...page, [field]: value } : page
      ),
    });
  }, [outline, onUpdateOutline]);

  // 更新页面要点
  const updatePagePoint = useCallback((pageIndex: number, pointIndex: number, value: string) => {
    if (!outline) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        const newPoints = [...page.points];
        newPoints[pointIndex] = value;
        return { ...page, points: newPoints };
      }),
    });
  }, [outline, onUpdateOutline]);

  // 添加要点
  const addPoint = useCallback((pageIndex: number) => {
    if (!outline) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        return { ...page, points: [...page.points, ""] };
      }),
    });
  }, [outline, onUpdateOutline]);

  // 删除要点
  const deletePoint = useCallback((pageIndex: number, pointIndex: number) => {
    if (!outline) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        return { ...page, points: page.points.filter((_, pi) => pi !== pointIndex) };
      }),
    });
  }, [outline, onUpdateOutline]);

  // 添加页面
  const addPage = useCallback((afterIndex: number) => {
    if (!outline) return;
    const newPages = [...outline.pages];
    const newPage = {
      pageNumber: afterIndex + 2,
      heading: "新页面",
      points: [""],
      imageDesc: "",
      script: "",
    };
    newPages.splice(afterIndex + 1, 0, newPage);
    onUpdateOutline({
      ...outline,
      pages: newPages.map((page, i) => ({ ...page, pageNumber: i + 1 })),
    });
    setExpandedPages(prev => new Set([...prev, afterIndex + 1]));
  }, [outline, onUpdateOutline]);

  // 删除页面
  const deletePage = useCallback((index: number) => {
    if (!outline || outline.pages.length <= 1) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages
        .filter((_, i) => i !== index)
        .map((page, i) => ({ ...page, pageNumber: i + 1 })),
    });
  }, [outline, onUpdateOutline]);

  // 移动页面
  const movePage = useCallback((index: number, direction: "up" | "down") => {
    if (!outline) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= outline.pages.length) return;

    const newPages = [...outline.pages];
    [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];
    onUpdateOutline({
      ...outline,
      pages: newPages.map((page, i) => ({ ...page, pageNumber: i + 1 })),
    });
  }, [outline, onUpdateOutline]);

  // 更新页面补充信息
  const updatePageSupplement = useCallback((pageIndex: number, supplement: PageSupplement) => {
    if (!outline) return;
    onUpdateOutline({
      ...outline,
      pages: outline.pages.map((page, i) =>
        i === pageIndex ? { ...page, supplement } : page
      ),
    });
  }, [outline, onUpdateOutline]);

  // 更新补充文字
  const updateSupplementText = useCallback((pageIndex: number, text: string) => {
    if (!outline) return;
    const currentSupplement = outline.pages[pageIndex]?.supplement || {};
    updatePageSupplement(pageIndex, { ...currentSupplement, text: text || undefined });
  }, [outline, updatePageSupplement]);

  // 更新补充图片引用
  const updateSupplementImageRefs = useCallback((pageIndex: number, imageRefs: string[]) => {
    if (!outline) return;
    const currentSupplement = outline.pages[pageIndex]?.supplement || {};
    updatePageSupplement(pageIndex, {
      ...currentSupplement,
      imageRefs: imageRefs.length > 0 ? imageRefs : undefined,
    });
  }, [outline, updatePageSupplement]);

  // 移除单个补充图片引用
  const removeSupplementImageRef = useCallback((pageIndex: number, imageId: string) => {
    if (!outline) return;
    const currentRefs = outline.pages[pageIndex]?.supplement?.imageRefs || [];
    updateSupplementImageRefs(pageIndex, currentRefs.filter(id => id !== imageId));
  }, [outline, updateSupplementImageRefs]);

  // 获取可用于补充的图片（排除基底图）
  const getAvailableSupplementImages = useCallback(() => {
    const templateId = selectedTemplateId || connectedImages[0]?.id;
    // 如果只有一张图片，则不显示补充图片功能（那张图片是基底图）
    if (connectedImages.length <= 1) return [];
    return connectedImages.filter(img => img.id !== templateId);
  }, [connectedImages, selectedTemplateId]);

  // 渲染状态信息
  const renderStatus = () => {
    switch (outlineStatus) {
      case "generating":
        return (
          <div className="flex items-center gap-2 text-primary">
            <LoadingIndicator size="sm" variant="dots" className="text-primary" />
            <span className="text-sm font-medium">正在生成大纲...</span>
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">已生成 {outline?.pages.length || 0} 页</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm truncate" title={outlineError}>
              {outlineError}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  // 未生成大纲时的状态
  if (outlineStatus === "idle" || outlineStatus === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        {outlineStatus === "generating" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LoadingIndicator size="lg" variant="dots" className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-base-content/80">正在生成大纲...</p>
              <p className="text-sm text-base-content/50 mt-1">AI 正在分析您的主题并规划 PPT 结构</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center">
              <FileText className="w-10 h-10 text-base-content/30" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-lg font-medium text-base-content/70 mb-2">尚未生成大纲</p>
              <p className="text-sm text-base-content/50">
                请先在「配置」标签页设置参数，然后点击下方按钮开始生成
              </p>
            </div>
            {!hasPromptInput && (
              <div className="flex items-center gap-2 text-warning text-sm bg-warning/10 rounded-lg px-4 py-2.5 border border-warning/20">
                <AlertCircle className="w-4 h-4" />
                <span>请先连接提示词节点并输入 PPT 主题</span>
              </div>
            )}
            <button
              className="btn btn-primary gap-2 px-6"
              onClick={onGenerateOutline}
              disabled={!hasPromptInput}
            >
              <RefreshCw className="w-4 h-4" />
              生成大纲
            </button>
          </>
        )}
      </div>
    );
  }

  // 生成错误时
  if (outlineStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-error mb-2">生成失败</p>
          <p className="text-sm text-base-content/60 max-w-md">{outlineError}</p>
        </div>
        <button
          className="btn btn-primary gap-2 px-6"
          onClick={onGenerateOutline}
        >
          <RefreshCw className="w-4 h-4" />
          重新生成
        </button>
      </div>
    );
  }

  // 已生成大纲 - 内嵌编辑器
  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 顶部：状态 + 标题 + 重新生成，合并到一行 */}
      <div className="flex items-center gap-3 px-1">
        {renderStatus()}
        <div className="flex-1" />
        <button
          className="btn btn-ghost btn-xs gap-1"
          onClick={onGenerateOutline}
        >
          <RefreshCw className="w-3 h-3" />
          重新生成
        </button>
      </div>

      {outline && (
        <>
          {/* 标题编辑 - 更紧凑 */}
          <div className="flex items-center gap-2 px-1">
            <label className="text-xs text-base-content/50 whitespace-nowrap">标题</label>
            <ComposableInput
              className="input input-bordered input-sm flex-1 font-medium"
              value={outline.title}
              placeholder="输入 PPT 标题..."
              onChange={updateTitle}
            />
          </div>

          {/* 页面列表 */}
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {outline.pages.map((page, index) => {
              const isExpanded = expandedPages.has(index);
              return (
                <div
                  key={index}
                  className={`
                    border rounded-lg overflow-hidden transition-all duration-200
                    ${isExpanded
                      ? "border-primary/30 shadow-sm bg-base-100"
                      : "border-base-300 bg-base-100 hover:border-base-400"
                    }
                  `}
                >
                  {/* 页面头部 - 更紧凑 */}
                  <div
                    className={`
                      flex items-center gap-2 px-3 py-2 cursor-pointer select-none
                      ${isExpanded ? "bg-primary/5" : "hover:bg-base-200/50"}
                    `}
                    onClick={() => togglePage(index)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-base-content/30 cursor-grab" />

                    <div className={`
                      w-6 h-6 rounded flex items-center justify-center text-xs font-bold
                      ${isExpanded
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content/60"
                      }
                    `}>
                      {page.pageNumber}
                    </div>

                    <span className={`
                      flex-1 text-sm font-medium truncate
                      ${isExpanded ? "text-primary" : "text-base-content/80"}
                    `}>
                      {page.heading || "未命名页面"}
                    </span>

                    {/* 要点数量指示 */}
                    {!isExpanded && page.points.filter(p => p.trim()).length > 0 && (
                      <span className="text-[10px] text-base-content/50 bg-base-200 px-1.5 py-0.5 rounded">
                        {page.points.filter(p => p.trim()).length} 点
                      </span>
                    )}

                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={() => movePage(index, "up")}
                        disabled={index === 0}
                        title="上移"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={() => movePage(index, "down")}
                        disabled={index === outline.pages.length - 1}
                        title="下移"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10"
                        onClick={() => deletePage(index)}
                        disabled={outline.pages.length <= 1}
                        title="删除页面"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ChevronRight className={`w-4 h-4 text-base-content/40 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>

                  {/* 页面内容编辑 */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-base-200">
                      {/* 页面标题 */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-2">
                          <FileText className="w-3.5 h-3.5" />
                          页面标题
                        </label>
                        <ComposableInput
                          className="input input-bordered input-sm w-full"
                          value={page.heading}
                          placeholder="输入页面标题..."
                          onChange={(value) => updatePageField(index, "heading", value)}
                        />
                      </div>

                      {/* PPT 要点 */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          PPT 要点
                        </label>
                        <div className="space-y-2">
                          {page.points.map((point, pointIndex) => (
                            <div key={pointIndex} className="flex items-center gap-2 group">
                              <span className="text-xs text-primary/60 font-medium w-5 text-right">
                                {pointIndex + 1}.
                              </span>
                              <ComposableInput
                                className="input input-bordered input-sm flex-1"
                                value={point}
                                placeholder="输入要点内容..."
                                onChange={(value) => updatePagePoint(index, pointIndex, value)}
                              />
                              <button
                                className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deletePoint(index, pointIndex)}
                                disabled={page.points.length <= 1}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            className="btn btn-ghost btn-xs gap-1 text-primary hover:bg-primary/10 ml-7"
                            onClick={() => addPoint(index)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            添加要点
                          </button>
                        </div>
                      </div>

                      {/* 推荐配图描述 */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-2">
                          <Image className="w-3.5 h-3.5" />
                          推荐配图（可选）
                        </label>
                        <ComposableInput
                          className="input input-bordered input-sm w-full"
                          value={page.imageDesc || ""}
                          placeholder="描述适合的图表或示意图..."
                          onChange={(value) => updatePageField(index, "imageDesc", value)}
                        />
                      </div>

                      {/* 口头讲稿 */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/60 mb-2">
                          <Mic className="w-3.5 h-3.5" />
                          口头讲稿
                        </label>
                        <ComposableTextarea
                          className="textarea textarea-bordered w-full min-h-[100px] resize-none text-sm"
                          value={page.script}
                          placeholder="输入演讲时的口头讲稿..."
                          onChange={(value) => updatePageField(index, "script", value)}
                        />
                      </div>

                      {/* 额外补充（可选） */}
                      <div className="bg-base-200/30 rounded-lg p-3 space-y-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <Sparkles className="w-3.5 h-3.5" />
                          额外补充（可选）
                        </label>

                        {/* 补充说明文字 */}
                        <SupplementTextInput
                          value={page.supplement?.text || ""}
                          onChange={(text) => updateSupplementText(index, text)}
                        />

                        {/* 参考图片 */}
                        {(() => {
                          const availableImages = getAvailableSupplementImages();
                          const currentRefs = page.supplement?.imageRefs || [];
                          const selectedImages = currentRefs
                            .map(id => connectedImages.find(img => img.id === id))
                            .filter((img): img is ConnectedImageInfo => !!img);

                          // 如果没有可用的补充图片，不显示此区域
                          if (availableImages.length === 0) return null;

                          return (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] text-base-content/50">
                                  参考图片
                                </label>
                                <span className="text-[10px] text-base-content/40">
                                  可用 {availableImages.length} 张
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* 已选图片标签 */}
                                {selectedImages.map((img) => (
                                  <ImageRefTag
                                    key={img.id}
                                    id={img.id}
                                    fileName={img.fileName || `图片-${img.id.slice(0, 4)}`}
                                    imageData={img.imageData}
                                    imagePath={img.imagePath}
                                    onRemove={() => removeSupplementImageRef(index, img.id)}
                                  />
                                ))}

                                {/* 添加按钮 */}
                                <button
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
                                  onClick={() => setImageSelectorPage(index)}
                                >
                                  <Plus className="w-3 h-3" />
                                  添加
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 在此页后添加新页面 */}
                      <button
                        className="btn btn-ghost btn-sm w-full gap-1.5 border border-dashed border-base-300 hover:border-primary hover:bg-primary/5 text-base-content/60 hover:text-primary"
                        onClick={() => addPage(index)}
                      >
                        <Plus className="w-4 h-4" />
                        在此后添加页面
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 图片选择器弹窗 */}
          {imageSelectorPage !== null && outline && (
            <ImageSelectorModal
              images={getAvailableSupplementImages()}
              selectedIds={outline.pages[imageSelectorPage]?.supplement?.imageRefs || []}
              onConfirm={(ids) => {
                updateSupplementImageRefs(imageSelectorPage, ids);
                setImageSelectorPage(null);
              }}
              onClose={() => setImageSelectorPage(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
