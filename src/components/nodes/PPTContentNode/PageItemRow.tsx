import { useState, useRef, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  RotateCcw,
  Upload,
  Maximize2,
  Play,
  Square,
  FileText,
  ChevronDown,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import type { PPTPageItem, PPTPageStatus, ConnectedImageInfo } from "./types";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { getImageUrl } from "@/services/fileStorageService";

interface PageItemRowProps {
  item: PPTPageItem;
  onRetry: (id: string) => void;
  onSkip: (id: string) => void;
  onRun: (id: string) => void;
  onStop: (id: string) => void;
  onUploadImage: (id: string, imageData: string) => void;
  onShowScript?: (item: PPTPageItem) => void;
  connectedImages?: ConnectedImageInfo[];
  disabled?: boolean;
}

// 静态状态图标映射（running 状态在组件内部动态渲染）
const StaticStatusIcon: Record<Exclude<PPTPageStatus, "running">, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-base-content/40" />,
  completed: <CheckCircle className="w-4 h-4 text-success" />,
  failed: <XCircle className="w-4 h-4 text-error" />,
  skipped: <SkipForward className="w-4 h-4 text-warning" />,
};

// 状态文本映射
const StatusText: Record<PPTPageStatus, string> = {
  pending: "待生成",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  skipped: "已跳过",
};

// 状态背景色映射
const StatusBg: Record<PPTPageStatus, string> = {
  pending: "bg-base-200",
  running: "bg-info/10 border-info/30",
  completed: "bg-success/5 border-success/20",
  failed: "bg-error/5 border-error/20",
  skipped: "bg-warning/5 border-warning/20",
};

// 简单的 Markdown 渲染函数（支持 **粗体** 和 *斜体*）
function renderSimpleMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // 匹配 **粗体** 和 *斜体*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-base-content">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export function PageItemRow({
  item,
  onRetry,
  onSkip: _onSkip, // 保留接口但暂不使用
  onRun,
  onStop,
  onUploadImage,
  onShowScript,
  connectedImages = [],
  disabled = false,
}: PageItemRowProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保留 _onSkip 以避免 lint 警告
  void _onSkip;

  // 获取显示的图片（优先使用手动上传，然后是生成的图片）
  const displayImage = item.manualImage || item.result?.image;
  // 获取图片路径（优先使用手动上传的路径，然后是生成的路径）
  const displayImagePath = item.manualImagePath || item.result?.imagePath;
  // 获取缩略图（优先使用手动上传的缩略图，然后是生成的缩略图）
  const displayThumbnail = item.manualThumbnail || item.result?.thumbnail;
  const displayThumbnailPath = item.manualThumbnailPath || item.result?.thumbnailPath;

  // 计算缩略图显示 URL（优先使用缩略图，减少内存占用）
  const getThumbnailUrl = useCallback(() => {
    // 优先使用缩略图路径
    if (displayThumbnailPath) {
      return getImageUrl(displayThumbnailPath);
    }
    // 其次使用缩略图 base64（JPEG 格式）
    if (displayThumbnail) {
      return `data:image/jpeg;base64,${displayThumbnail}`;
    }
    // 回退到原图路径
    if (displayImagePath) {
      return getImageUrl(displayImagePath);
    }
    // 最后回退到原图 base64
    if (displayImage) {
      return `data:image/png;base64,${displayImage}`;
    }
    return undefined;
  }, [displayThumbnail, displayThumbnailPath, displayImage, displayImagePath]);

  // 处理图片上传
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(",")[1];
      onUploadImage(item.id, base64);
    };
    reader.readAsDataURL(file);

    // 清空 input 以允许重复上传同一文件
    e.target.value = "";
  }, [item.id, onUploadImage]);

  // 切换展开状态
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <>
      <div
        className={`
          rounded-xl border overflow-hidden transition-all duration-200
          ${StatusBg[item.status]}
          ${isExpanded ? "shadow-md" : "hover:shadow-sm"}
        `}
      >
        {/* 主行内容 - 可点击展开 */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer select-none"
          onClick={toggleExpand}
        >
          {/* 展开/收起图标 */}
          <div className="flex-shrink-0 text-base-content/40">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>

          {/* 状态图标 */}
          <div className="flex-shrink-0" title={StatusText[item.status]}>
            {item.status === "running" ? (
              <span className="inline-flex items-center justify-center w-4 h-4">
                <span className="loading loading-spinner loading-xs text-primary" />
              </span>
            ) : (
              StaticStatusIcon[item.status]
            )}
          </div>

          {/* 页面信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">
                第 {item.pageNumber} 页
              </span>
              <span className="text-sm text-base-content/80 truncate">
                {item.heading}
              </span>
            </div>
            {/* 要点预览 - 收起状态 */}
            {!isExpanded && item.points.length > 0 && (
              <div className="text-xs text-base-content/50 mt-0.5 line-clamp-1">
                {renderSimpleMarkdown(item.points[0])}
                {item.points.length > 1 && (
                  <span className="text-base-content/40 ml-1">
                    (+{item.points.length - 1} 项)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 图片预览 - 更大尺寸 */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {(displayImage || displayImagePath || displayThumbnail || displayThumbnailPath) ? (
              <div
                className="relative w-28 h-16 rounded-lg overflow-hidden cursor-pointer group shadow-sm border border-base-300"
                onClick={() => setShowPreview(true)}
              >
                <img
                  src={getThumbnailUrl()}
                  alt={`Page ${item.pageNumber}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
                {(item.manualImage || item.manualImagePath) && (
                  <div className="absolute top-1 right-1 bg-warning text-warning-content text-[9px] px-1.5 py-0.5 rounded font-medium">
                    手动
                  </div>
                )}
              </div>
            ) : (
              <div className="w-28 h-16 rounded-lg bg-base-300/50 flex items-center justify-center border border-base-300/50">
                <span className="text-base-content/30 text-xs">暂无图片</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {item.status === "running" ? (
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => onStop(item.id)}
                title="停止"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <>
                {item.status === "pending" && (
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={() => onRun(item.id)}
                    disabled={disabled}
                    title="开始生成"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {(item.status === "completed" || item.status === "failed") && (
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={() => onRetry(item.id)}
                    disabled={disabled}
                    title="重新生成"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {/* 查看讲稿 */}
            {item.script && onShowScript && (
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => onShowScript(item)}
                title="查看讲稿"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}

            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => fileInputRef.current?.click()}
              disabled={item.status === "running"}
              title="上传替换图片"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-base-300/50 bg-base-100/50">
            {/* PPT 要点 */}
            <div className="mb-3">
              <div className="text-xs font-medium text-base-content/60 mb-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-primary" />
                PPT 要点
              </div>
              <div className="space-y-1.5 pl-2">
                {item.points.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-base-content/80"
                  >
                    <span className="text-xs text-primary/60 font-medium mt-0.5 min-w-[16px]">
                      {index + 1}.
                    </span>
                    <span className="flex-1 leading-relaxed">
                      {renderSimpleMarkdown(point)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 推荐配图描述 */}
            {item.imageDesc && (
              <div className="mb-3">
                <div className="text-xs font-medium text-base-content/60 mb-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-secondary" />
                  推荐配图
                </div>
                <p className="text-sm text-base-content/70 pl-2 leading-relaxed">
                  {item.imageDesc}
                </p>
              </div>
            )}

            {/* 口头讲稿预览 */}
            {item.script && (
              <div>
                <div className="text-xs font-medium text-base-content/60 mb-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  口头讲稿
                </div>
                <p className="text-sm text-base-content/60 pl-2 leading-relaxed line-clamp-3">
                  {item.script}
                </p>
                {item.script.length > 150 && onShowScript && (
                  <button
                    className="text-xs text-primary hover:underline ml-2 mt-1"
                    onClick={() => onShowScript(item)}
                  >
                    查看完整讲稿 →
                  </button>
                )}
              </div>
            )}

            {/* 额外补充说明 */}
            {(item.supplement?.text || (item.supplement?.imageRefs && item.supplement.imageRefs.length > 0)) && (
              <div className="mt-3 p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                {/* 补充说明文字 */}
                {item.supplement?.text && (
                  <>
                    <div className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      补充说明
                    </div>
                    <p className="text-sm text-base-content/70 pl-2 leading-relaxed">
                      {item.supplement.text}
                    </p>
                  </>
                )}

                {/* 参考图片 */}
                {item.supplement?.imageRefs && item.supplement.imageRefs.length > 0 && (
                  <div className={item.supplement?.text ? "mt-2 pt-2 border-t border-primary/10" : ""}>
                    <div className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      参考图片
                    </div>
                    <div className="flex flex-wrap gap-2 pl-2">
                      {item.supplement.imageRefs.map((imageId) => {
                        const img = connectedImages.find(i => i.id === imageId);
                        if (!img) return null;
                        return (
                          <div
                            key={imageId}
                            className="relative w-12 h-12 rounded-md overflow-hidden border border-base-300 bg-base-200"
                            title={img.fileName || imageId}
                          >
                            <img
                              src={
                                img.imagePath
                                  ? getImageUrl(img.imagePath)
                                  : img.imageData
                                    ? `data:image/png;base64,${img.imageData}`
                                    : undefined
                              }
                              alt={img.fileName || "参考图片"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 错误信息 */}
            {item.error && (
              <div className="mt-3 p-2.5 bg-error/10 rounded-lg border border-error/20">
                <p className="text-xs text-error flex items-start gap-1.5">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{item.error}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
      {showPreview && (displayImage || displayImagePath) && (
        <ImagePreviewModal
          imageData={displayImage}
          imagePath={displayImagePath}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
