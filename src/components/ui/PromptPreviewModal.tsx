import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Tag,
  FileText,
  Image as ImageIcon,
  Zap,
  Sparkles,
  ImagePlus,
  RectangleHorizontal,
} from "lucide-react";
import type { PromptItem } from "@/config/promptConfig";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";

interface PromptPreviewModalProps {
  prompt: PromptItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PromptPreviewModal({ prompt, isOpen, onClose }: PromptPreviewModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // 处理打开/关闭动画
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setIsAnimatingIn(true);
      setImageLoaded(false);
      setImageError(false);
      setIsImagePreviewOpen(false); // 重置图片预览状态

      // 触发入场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(false);
        });
      });
    }
  }, [isOpen]);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // 复制提示词
  const copyToClipboard = useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  }, [prompt]);

  if (!isVisible || !prompt) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* 背景遮罩 - 与整体动画同步 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimatingIn || isClosing ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Modal 内容 */}
      <div
        className={`
          relative w-full max-w-2xl max-h-[90vh] bg-base-100 rounded-2xl shadow-2xl
          overflow-hidden flex flex-col
          transition-all duration-200 ease-out
          ${
            isAnimatingIn
              ? "scale-95 opacity-0 translate-y-4"
              : isClosing
                ? "scale-95 opacity-0"
                : "scale-100 opacity-100 translate-y-0"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 渐变头部 */}
        <div className="relative bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{prompt.title}</h2>
              <p className="text-sm text-base-content/60 truncate">{prompt.titleEn}</p>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-base-100/50 rounded-full"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 描述 */}
          <div>
            <p className="text-sm text-base-content/80">{prompt.description}</p>
          </div>

          {/* 模板配置信息 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 模型类型 */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                prompt.nodeTemplate.generatorType === "pro"
                  ? "bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-purple-600 dark:text-purple-400"
                  : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              {prompt.nodeTemplate.generatorType === "pro" ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {prompt.nodeTemplate.generatorType === "pro" ? "Pro 模型" : "Fast 模型"}
            </div>

            {/* 是否需要图片输入 */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                prompt.nodeTemplate.requiresImageInput
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-base-200 text-base-content/60"
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {prompt.nodeTemplate.requiresImageInput ? "需要图片输入" : "无需图片输入"}
            </div>

            {/* 宽高比 */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-base-200 text-base-content/70">
              <RectangleHorizontal className="w-3.5 h-3.5" />
              {prompt.nodeTemplate.aspectRatio}
            </div>
          </div>

          {/* 预览图 */}
          {prompt.previewImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                <ImageIcon className="w-4 h-4" />
                <span>效果预览</span>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-base-200 border border-base-300">
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </div>
                )}
                {imageError ? (
                  <div className="flex items-center justify-center py-12 text-base-content/40">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">图片加载失败</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={prompt.previewImage}
                    alt={prompt.title}
                    className={`w-full h-auto max-h-80 object-contain transition-opacity duration-300 cursor-pointer hover:opacity-90 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    onClick={() => setIsImagePreviewOpen(true)}
                    title="点击查看大图"
                  />
                )}
              </div>
            </div>
          )}

          {/* 提示词内容 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                <FileText className="w-4 h-4" />
                <span>提示词内容</span>
              </div>
              <button
                className={`btn btn-ghost btn-xs gap-1 ${copied ? "text-success" : ""}`}
                onClick={copyToClipboard}
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
            <div className="bg-base-200 rounded-xl p-3 border border-base-300">
              <pre className="text-sm text-base-content/80 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-60 overflow-y-auto">
                {prompt.prompt}
              </pre>
            </div>
          </div>

          {/* 来源 */}
          {prompt.source && (
            <div className="flex items-center gap-2 text-xs text-base-content/50 pt-2 border-t border-base-200">
              <ExternalLink className="w-3 h-3" />
              <span>来源: {prompt.source}</span>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="p-4 border-t border-base-200 bg-base-100">
          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              关闭
            </button>
            <button
              className={`btn btn-primary btn-sm gap-1.5 ${copied ? "btn-success" : ""}`}
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制到剪贴板
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制提示词
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 图片预览 Modal */}
      {isImagePreviewOpen && prompt.previewImage && (
        <ImagePreviewModal
          imageData={
            prompt.previewImage.startsWith("data:image")
              ? prompt.previewImage.replace(/^data:image\/\w+;base64,/, "")
              : undefined
          }
          imagePath={
            prompt.previewImage.startsWith("http://") || prompt.previewImage.startsWith("https://")
              ? prompt.previewImage
              : !prompt.previewImage.startsWith("data:")
                ? prompt.previewImage
                : undefined
          }
          onClose={() => setIsImagePreviewOpen(false)}
          fileName={`${prompt.title}.png`}
        />
      )}
    </div>,
    document.body
  );
}
