import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  Calendar,
  HardDrive,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getImageUrl,
  isTauriEnvironment,
  readImage,
  formatFileSize,
  type ImageInfoWithMetadata,
} from "@/services/fileStorageService";
import { toast } from "@/stores/toastStore";

interface ImageDetailModalProps {
  imageInfo: ImageInfoWithMetadata;
  onClose: () => void;
}

export function ImageDetailModal({ imageInfo, onClose }: ImageDetailModalProps) {
  const [scale, setScale] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [previewInputImage, setPreviewInputImage] = useState<{
    path?: string;
  } | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);  // 新增：图片加载失败状态

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 获取图片 URL
  const imageUrl = useMemo(() => {
    return getImageUrl(imageInfo.path);
  }, [imageInfo.path]);

  // 从元数据获取关联数据
  const metadata = imageInfo.metadata;
  const hasMetadata = Boolean(metadata?.prompt || (metadata?.input_images && metadata.input_images.length > 0));

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // 处理背景点击
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleClose();
    },
    [handleClose]
  );

  // 下载图片
  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const base64Data = await readImage(imageInfo.path);
      const defaultFileName = imageInfo.filename || `next-creator-${Date.now()}.png`;

      if (isTauriEnvironment()) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");

        const filePath = await save({
          defaultPath: defaultFileName,
          filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }],
        });

        if (filePath) {
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          await writeFile(filePath, bytes);
          toast.success(`图片已保存到: ${filePath.split("/").pop()}`);
        }
      } else {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("图片下载已开始");
      }
    } catch (error) {
      console.error("下载失败:", error);
      toast.error(`下载失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsDownloading(false);
    }
  }, [imageInfo.path, imageInfo.filename, isDownloading]);

  // 复制提示词
  const handleCopyPrompt = useCallback(async () => {
    if (!metadata?.prompt) return;

    try {
      await navigator.clipboard.writeText(metadata.prompt);
      setCopied(true);
      toast.success("提示词已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  }, [metadata?.prompt]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewInputImage) {
          setPreviewInputImage(null);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, previewInputImage]);

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/80" : "bg-black/0"}
      `}
      onClick={handleBackgroundClick}
    >
      {/* 主内容区域 */}
      <div
        className={`
          relative flex flex-col max-w-[90vw] max-h-[90vh]
          transition-all duration-200 ease-out
          ${isVisible && !isClosing ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 工具栏 */}
        <div className="absolute -top-12 right-0 flex items-center gap-2 z-10">
          <button
            className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
            onClick={handleZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
            onClick={handleZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            className={`btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0 ${
              isDownloading ? "btn-disabled" : ""
            }`}
            onClick={handleDownload}
            disabled={isDownloading}
            title="下载图片"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button
            className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 图片预览 */}
        <div className="overflow-auto rounded-t-xl bg-base-300/50">
          {imageLoadError ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-base-content/60">
              <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">图片加载失败</p>
              <p className="text-sm mt-2">图片文件可能已被删除或移动</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={imageInfo.filename}
              className="max-w-full max-h-[60vh] object-contain transition-transform duration-200 mx-auto"
              style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
              onError={() => setImageLoadError(true)}
            />
          )}
        </div>

        {/* 详情面板 */}
        <div className="bg-base-100 rounded-b-xl overflow-hidden">
          {/* 详情头部（可折叠） */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-200 transition-colors"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="flex items-center gap-3 text-sm">
              {/* 文件信息 */}
              <span className="flex items-center gap-1.5 text-base-content/70">
                <HardDrive className="w-3.5 h-3.5" />
                {formatFileSize(imageInfo.size)}
              </span>
              <span className="flex items-center gap-1.5 text-base-content/70">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(imageInfo.created_at * 1000).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {hasMetadata && (
                <>
                  {metadata?.prompt && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <FileText className="w-3.5 h-3.5" />
                      提示词
                    </span>
                  )}
                  {metadata?.input_images && metadata.input_images.length > 0 && (
                    <span className="flex items-center gap-1.5 text-secondary">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {metadata.input_images.length} 张输入图片
                    </span>
                  )}
                </>
              )}
            </div>
            {hasMetadata && (
              showDetails ? (
                <ChevronUp className="w-4 h-4 text-base-content/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-base-content/50" />
              )
            )}
          </button>

          {/* 详情内容 */}
          {showDetails && hasMetadata && (
            <div className="px-4 pb-4 space-y-3 border-t border-base-300">
              {/* 提示词 */}
              {metadata?.prompt && (
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      提示词
                    </h4>
                    <button
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={handleCopyPrompt}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          复制
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-base-200 rounded-lg p-3 text-sm text-base-content/80 max-h-32 overflow-y-auto">
                    <p className="whitespace-pre-wrap break-words">{metadata.prompt}</p>
                  </div>
                </div>
              )}

              {/* 输入图片 */}
              {metadata?.input_images && metadata.input_images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-secondary" />
                    输入图片
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {metadata.input_images.map((img, index) => (
                      <div key={index} className="relative">
                        {img.path ? (
                          <button
                            className="w-16 h-16 rounded-lg overflow-hidden bg-base-300 hover:ring-2 hover:ring-primary transition-all group"
                            onClick={() => setPreviewInputImage({ path: img.path })}
                            title={img.label}
                          >
                            <img
                              src={getImageUrl(img.path)}
                              alt={img.label}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          <div
                            className="w-16 h-16 rounded-lg bg-base-200 flex flex-col items-center justify-center text-base-content/40"
                            title={`${img.label}（原图已删除或不可用）`}
                          >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[10px] mt-0.5">不可用</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 无元数据时的提示 */}
          {!hasMetadata && (
            <div className="px-4 pb-3 pt-0">
              <p className="text-xs text-base-content/50">
                该图片没有关联的生成信息
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 输入图片预览弹窗 */}
      {previewInputImage && previewInputImage.path && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70"
          onClick={() => setPreviewInputImage(null)}
        >
          <div
            className="relative max-w-[80vw] max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-10 right-0 btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
              onClick={() => setPreviewInputImage(null)}
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={getImageUrl(previewInputImage.path)}
              alt="输入图片预览"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* 提示 */}
      <div
        className={`
          absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm
          transition-all duration-200 ease-out
          ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        点击背景或按 ESC 关闭
      </div>
    </div>,
    document.body
  );
}
